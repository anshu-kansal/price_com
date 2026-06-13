from __future__ import annotations

from datetime import timedelta
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional
import json
import threading
import uuid
import time
import os
import requests
import base64
import logging
from django.conf import settings
from core.services.query_cleaner import normalize_query
from apps.scraper.services.services import ScraperService
from django.db.models import Avg, Prefetch
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST, require_http_methods
from django.core.paginator import Paginator
from django.core.cache import cache

from apps.scraper.models import (
    NotificationLog,
    PriceAlert,
    PriceHistory,
    Product,
    StorePrice,
    Watchlist,
)

logger = logging.getLogger(__name__)


def _format_rupees(value: Optional[Decimal]) -> str:
    if value is None:
        return "N/A"
    try:
        return f"₹{int(Decimal(value)):,}"
    except (ValueError, ArithmeticError):
        return "N/A"


def _stat_cards_payload() -> tuple[List[Dict[str, Any]], Dict[str, Any]]:
    try:
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        today = now.date()

        total_products = Product.objects.filter(is_active=True).count()
        refreshed_products = (
            StorePrice.objects.filter(last_updated__gte=week_ago)
            .values_list('product_id', flat=True)
            .distinct()
            .count()
        )

        drops_today_qs = PriceHistory.objects.filter(recorded_at__date=today)
        downward_moves = drops_today_qs.filter(trend='DOWN').count()
        significant_drops = drops_today_qs.filter(is_significant_drop=True).count()

        avg_market_change = drops_today_qs.filter(change_percentage__isnull=False).aggregate(
            avg=Avg('change_percentage')
        )['avg']
        if avg_market_change is None:
            avg_market_change = (
                PriceHistory.objects.filter(recorded_at__gte=week_ago)
                .aggregate(avg=Avg('change_percentage'))
                .get('avg')
            )
        avg_market_change = float(avg_market_change or 0.0)

        open_alerts = PriceAlert.objects.filter(is_triggered=False).count()
        alerts_triggered_today = PriceAlert.objects.filter(
            is_triggered=True, created_at__date=today
        ).count()

        latest_sync = StorePrice.objects.order_by('-last_updated').first()
        freshness_value = 'OFFLINE'
        freshness_meta = 'no sync recorded'
        latency_seconds = None
        if latest_sync and latest_sync.last_updated:
            latency_delta = now - latest_sync.last_updated
            latency_seconds = latency_delta.total_seconds()
            if latency_seconds < 60:
                freshness_value = 'ONLINE'
                freshness_meta = f"{int(latency_seconds)}s ago"
            elif latency_seconds < 3600:
                freshness_value = 'SLOW'
                freshness_meta = f"{int(latency_seconds // 60)}m ago"
            else:
                freshness_value = 'STALE'
                freshness_meta = f"{int(latency_seconds // 3600)}h ago"

        # Build stat cards and meta consistently
        stat_cards = [
            {
                'title': 'Products Tracked',
                'value': f"{total_products:,}",
                'sublabel': f"{refreshed_products} refreshed 7d",
                'type': None,
            },
            {
                'title': 'Price Drops Today',
                'value': f"{downward_moves:,}",
                'sublabel': f"{significant_drops} deep cuts",
                'type': None,
            },
            {
                'title': 'Avg Market Change',
                'value': f"{avg_market_change:+.1f}%",
                'sublabel': '7d blended delta',
                'type': None,
            },
            {
                'title': 'Active Alerts',
                'value': f"{open_alerts:,}",
                'sublabel': f"{alerts_triggered_today} fired today",
                'type': None,
            },
            {
                'title': 'Data Freshness',
                'value': freshness_value,
                'sublabel': freshness_meta,
                'type': 'freshness',
            },
        ]

        meta = {
            'avg_market_change': avg_market_change,
            'drops_today': downward_moves,
            'significant_drops': significant_drops,
            'active_alerts': open_alerts,
            'latency_seconds': latency_seconds or 0,
        }
        return stat_cards, meta

    except Exception as e:
        logger.error(f"FATAL: _stat_cards_payload failed: {str(e)}", exc_info=True)
        return [], {
            'avg_market_change': 0.0,
            'drops_today': 0,
            'significant_drops': 0,
            'active_alerts': 0,
            'latency_seconds': 0,
        }


def _prediction_payload(meta: Dict[str, Any]) -> Dict[str, Any]:
    drops_today = meta.get('drops_today', 0)
    avg_market_change = meta.get('avg_market_change', 0.0)
    significant = meta.get('significant_drops', 0)

    if drops_today >= 15 or avg_market_change < -2.5:
        signal = 'ACQUIRE WINDOW'
    elif avg_market_change > 1.5:
        signal = 'WAIT 3 DAYS'
    else:
        signal = 'TRACK CLOSELY'

    confidence_base = 70 + (drops_today // 3) - int(abs(avg_market_change))
    confidence = max(55, min(95, confidence_base))

    heuristic_drop_probability = min(99, drops_today * 4 + significant * 3)
    smart_index = max(35, min(95, 80 - int(avg_market_change * 5)))

    signals = [
        f"{drops_today} downward events detected today",
        f"Avg movement {avg_market_change:+.1f}%",
        f"{significant} high-impact swings flagged" if significant else 'Liquidity stable across nodes',
    ]

    return {
        'signal': signal,
        'confidence': confidence,
        'signals': signals,
        'drop_probability': heuristic_drop_probability,
        'smart_index': smart_index,
    }


def _chart_payload(product_id: Optional[int] = None, period: str = '7d', limit: int = 100) -> Dict[str, Any]:
    def fallback() -> Dict[str, Any]:
        return {
            'series': [
                {'name': 'Amazon', 'data': [0] * 7},
                {'name': 'Flipkart', 'data': [0] * 7},
            ],
            'categories': [''] * 7,
            'product_id': None,
        }

    now = timezone.now()
    if period == '1m':
        start_date = now - timedelta(days=30)
    elif period == 'ytd':
        start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
    else:  # '7d' default
        start_date = now - timedelta(days=7)

    base_qs = StorePrice.objects.select_related('product').prefetch_related(
        Prefetch('history', queryset=PriceHistory.objects.filter(recorded_at__gte=start_date).order_by('-recorded_at'))
    )

    if product_id:
        store_prices = list(base_qs.filter(product_id=product_id))
    else:
        seed_history = PriceHistory.objects.filter(recorded_at__gte=start_date).select_related('store_price__product').order_by('-recorded_at').first()
        if not seed_history:
            return fallback()
        product_id = seed_history.store_price.product_id
        store_prices = list(base_qs.filter(product_id=product_id))


    if not store_prices:
        return fallback()

    timestamp_set = set()
    store_price_map: Dict[str, Dict[str, float]] = {}

    for store_price in store_prices:
        history_entries = list(store_price.history.all()[:limit])
        if not history_entries:
            continue
        entry_map: Dict[str, float] = {}
        for entry in reversed(history_entries):
            key = entry.recorded_at.isoformat()
            timestamp_set.add(entry.recorded_at)
            entry_map[key] = float(entry.price)
        store_price_map[store_price.store_name] = entry_map

    if not store_price_map:
        return fallback()

    ordered_timestamps = sorted(timestamp_set)[-limit:]
    if not ordered_timestamps:
        return fallback()
    categories = [ts.strftime('%d %b %H:%M') for ts in ordered_timestamps]

    series_payload = []
    for store_name, entry_map in store_price_map.items():
        data_points = []
        last_value = None
        for ts in ordered_timestamps:
            key = ts.isoformat()
            value = entry_map.get(key)
            if value is None:
                value = last_value
            else:
                last_value = value
            data_points.append(round(value, 2) if value is not None else None)
        if any(point is not None for point in data_points):
            series_payload.append({'name': store_name, 'data': data_points})

    if not series_payload:
        return fallback()

    return {
        'series': series_payload,
        'categories': categories,
        'product_id': product_id,
    }

def _watchlist_items(user) -> List[Dict[str, Any]]:
    qs = Watchlist.objects.select_related('product').prefetch_related(
        Prefetch('product__prices', queryset=StorePrice.objects.order_by('current_price'))
    )

    if user and user.is_authenticated:
        qs = qs.filter(user=user)
    else:
        qs = qs.order_by('-created_at')

    items: List[Dict[str, Any]] = []
    for entry in qs[:3]:
        product = entry.product
        if not product:
            continue

        current_price = product.current_lowest_price
        if current_price is None:
            current_price = (
                product.prices.all().order_by('current_price').values_list('current_price', flat=True).first()
            )

        target_price = entry.target_price or (
            Decimal(current_price) * Decimal('0.97') if current_price else None
        )

        if current_price is None:
            continue

        delta_value = Decimal(current_price) - Decimal(target_price or current_price)
        progress = 0
        if target_price and current_price:
            try:
                ratio = Decimal(target_price) / Decimal(current_price)
                progress = int(max(0, min(100, ratio * 100)))
            except (ArithmeticError, ValueError):
                progress = 0

        magnitude = abs(delta_value)
        if magnitude >= 1000:
            magnitude_label = f"{magnitude / Decimal('1000'):.1f}K"
        else:
            magnitude_label = f"{magnitude:.0f}"

        items.append(
            {
                'watchlist_id': str(entry.id) if hasattr(entry, 'id') else '',
                'product_id': product.id,
                'product_name': product.name.upper(),
                'target_price': target_price,
                'current_lowest_price': current_price,
                'delta': f"{'+' if delta_value >= 0 else '-'}{magnitude_label}_DELTA",
                'pct': progress or 5,
            }
        )

    return items


def _system_health_snapshot() -> Dict[str, Any]:
    now = timezone.now()
    total_nodes = StorePrice.objects.count()
    active_nodes = StorePrice.objects.filter(is_available=True).count()
    events_last_minute = PriceHistory.objects.filter(
        recorded_at__gte=now - timedelta(minutes=1)
    ).count()

    per_second = max(1, round(events_last_minute / 60, 1))
    latest_sync = StorePrice.objects.order_by('-last_updated').values_list('last_updated', flat=True).first()
    latency_display = 'n/a'
    if latest_sync:
        latency_delta = now - latest_sync
        if latency_delta.total_seconds() < 1:
            latency_display = f"{int(latency_delta.total_seconds() * 1000)}ms"
        elif latency_delta.total_seconds() < 60:
            latency_display = f"{latency_delta.total_seconds():.1f}s"
        else:
            latency_display = f"{int(latency_delta.total_seconds() // 60)}m"

    cpu_load = min(97, max(20, int(per_second * 8)))

    nodes_display = f"{active_nodes}/{total_nodes or 1}"
    return {
        'nodes': nodes_display,
        'queue': f"{per_second}/s",
        'latency': latency_display,
        'cpu': cpu_load,
    }

def _custom_stat_cards_payload(user) -> List[Dict[str, Any]]:
    total_products = Product.objects.filter(is_active=True).count()
    
    if user and user.is_authenticated:
        active_alerts = Watchlist.objects.filter(user=user, target_price__isnull=False).count()
        watchlist_count = Watchlist.objects.filter(user=user).count()
        
        # Calculate savings
        total_savings = Decimal('0.00')
        watchlist_items = Watchlist.objects.filter(user=user).select_related('product')
        for item in watchlist_items:
            if item.product and item.product.current_lowest_price and item.added_price:
                diff = item.added_price - item.product.current_lowest_price
                if diff > 0:
                    total_savings += diff
    else:
        active_alerts = 0
        watchlist_count = 0
        total_savings = Decimal('0.00')
        
    savings_str = f"₹{int(total_savings):,}"
    
    return [
        {
            'title': 'Products Tracked',
            'value': f"{total_products:,}",
            'icon': 'fas fa-layer-group',
            'trend': '+12% this week',
            'trend_type': 'up',
            'subtext': 'Active catalog size'
        },
        {
            'title': 'Active Alerts',
            'value': str(active_alerts),
            'icon': 'fas fa-bell',
            'trend': 'Trigger configured',
            'trend_type': 'neutral',
            'subtext': 'Alerts pending'
        },
        {
            'title': 'Total Savings Found',
            'value': savings_str,
            'icon': 'fas fa-piggy-bank',
            'trend': 'Optimal buying',
            'trend_type': 'success',
            'subtext': 'Based on entry drops'
        },
        {
            'title': 'Products in Watchlist',
            'value': str(watchlist_count),
            'icon': 'fas fa-heart',
            'trend': 'Live monitoring',
            'trend_type': 'neutral',
            'subtext': 'Products in watch'
        }
    ]

@login_required
def dashboard_home(request):
    """
    Dashboard Home View -- hydrates template context with live metrics.
    """
    try:
        # 4 Custom SaaS KPI Cards
        stat_cards = _custom_stat_cards_payload(request.user)
        _, meta = _stat_cards_payload()
        prediction_payload = _prediction_payload(meta)
        chart_seed = _chart_payload()

        ticker_drops = list(PriceHistory.objects.get_biggest_drops(limit=10))
        ticker_alerts = []

        for drop in ticker_drops:
            sp = drop.store_price
            product = sp.product
            delta = timezone.now() - drop.recorded_at

            if delta.days > 0:
                time_ago = f"T-{delta.days}d"
            elif delta.seconds >= 3600:
                time_ago = f"T-{delta.seconds // 3600}h"
            elif delta.seconds >= 60:
                time_ago = f"T-{delta.seconds // 60}m"
            else:
                time_ago = f"T-{delta.seconds}s"

            orig_price = drop.price / (1 + (drop.change_percentage / Decimal('100'))) if drop.change_percentage else drop.price
            
            icon = product.category.icon if product.category else 'fas fa-box'
            if 'mobile' in icon.lower() or 'phone' in icon.lower():
                icon_color = 'text-indigo-500'
            elif 'laptop' in icon.lower() or 'computer' in icon.lower():
                icon_color = 'text-amber-500'
            else:
                icon_color = 'text-rose-500'

            ticker_alerts.append({
                'name': product.name.upper()[:15],
                'icon': icon,
                'icon_color': icon_color,
                'drop_pct': f"{float(drop.change_percentage):.1f}%",
                'old_price': _format_rupees(orig_price),
                'new_price': _format_rupees(drop.price),
                'store': sp.store_name.upper()[:4],
                'time_ago': time_ago,
                'product_url': getattr(sp, 'product_url', '#') or '#',
            })

        if not ticker_alerts:
            ticker_alerts = [
                {'name': 'IPHONE-14-128', 'icon': 'fas fa-mobile-screen', 'icon_color': 'text-rose-500', 'drop_pct': '-5.4%', 'old_price': '₹61,499', 'new_price': '₹58,000', 'store': 'AMZN', 'time_ago': 'T-4m', 'product_url': '#'},
                {'name': 'SAMSUNG-S23-256', 'icon': 'fas fa-mobile', 'icon_color': 'text-indigo-500', 'drop_pct': 'RESTOCK', 'old_price': 'QTY: 14', 'new_price': '', 'store': 'FLKP', 'time_ago': 'T-12m', 'product_url': '#'},
                {'name': 'SONY-WH-1000XM5', 'icon': 'fas fa-headphones', 'icon_color': 'text-amber-500', 'drop_pct': '+13.5%', 'old_price': '₹29,990', 'new_price': '₹25,950', 'store': 'CROM', 'time_ago': 'T-2s', 'product_url': '#'},
            ]

        quick_buy_deals = [
            {
                'name': alert['name'],
                'store': alert['store'],
                'price': alert['new_price'] or alert['old_price'],
                'drop_pct': alert['drop_pct'],
                'url': alert.get('product_url', '#'),
            }
            for alert in ticker_alerts[:3]
        ]

        # Calculate Lower Section Cards
        # 1. Recent Alerts
        recent_alerts_qs = NotificationLog.objects.filter(user=request.user).order_by('-intent_timestamp')[:5]
        recent_alerts = []
        for log in recent_alerts_qs:
            recent_alerts.append({
                'product_name': log.product.name if log.product else 'System Notification',
                'alert_type': log.get_alert_type_display(),
                'status': log.status,
                'price': _format_rupees(log.price_at_alert),
                'time_ago': log.intent_timestamp.strftime('%d %b, %H:%M')
            })
        if not recent_alerts:
            recent_alerts = [
                {'product_name': 'iPhone 15 Pro Max', 'alert_type': 'Price Drop', 'status': 'SENT', 'price': '₹1,34,999', 'time_ago': 'Just now'},
                {'product_name': 'Sony WH-1000XM5 Headphones', 'alert_type': 'Price Drop', 'status': 'SENT', 'price': '₹24,990', 'time_ago': '2 hours ago'},
                {'product_name': 'Kindle Paperwhite 16GB', 'alert_type': 'Back in Stock', 'status': 'SENT', 'price': '₹13,999', 'time_ago': '1 day ago'}
            ]

        # 2. Top Deals Today (Highest discount percent)
        deals_qs = Product.objects.filter(
            is_active=True,
            base_price__isnull=False,
            current_lowest_price__isnull=False,
            base_price__gt=0
        ).prefetch_related('prices')
        
        deals_list = []
        for p in deals_qs:
            discount_pct = float(((p.base_price - p.current_lowest_price) / p.base_price) * Decimal('100.0'))
            if discount_pct > 0:
                deals_list.append((p, discount_pct))
        deals_list.sort(key=lambda x: x[1], reverse=True)
        
        top_deals = []
        for p, pct in deals_list[:3]:
            store_prices = list(p.prices.all())
            best_store = store_prices[0].store_name if store_prices else "Amazon"
            top_deals.append({
                'product_name': p.name,
                'discount_percent': f"{pct:.1f}% OFF",
                'current_price': _format_rupees(p.current_lowest_price),
                'base_price': _format_rupees(p.base_price),
                'store': best_store,
                'id': p.id
            })
        if not top_deals:
            top_deals = [
                {'product_name': 'Apple Watch Series 9', 'discount_percent': '15.2% OFF', 'current_price': '₹37,900', 'base_price': '₹44,900', 'store': 'Amazon', 'id': 1},
                {'product_name': 'MacBook Air M2 8GB/256GB', 'discount_percent': '12.5% OFF', 'current_price': '₹99,990', 'base_price': '₹1,14,900', 'store': 'Flipkart', 'id': 2}
            ]

        # 3. Most Tracked Products
        from django.db.models import Count
        most_tracked_qs = Watchlist.objects.values('product').annotate(count=Count('product')).order_by('-count')[:3]
        most_tracked = []
        for item in most_tracked_qs:
            prod = Product.objects.filter(id=item['product']).first()
            if prod:
                most_tracked.append({
                    'product_name': prod.name,
                    'count': item['count'],
                    'current_price': _format_rupees(prod.current_lowest_price),
                    'id': prod.id
                })
        if not most_tracked:
            most_tracked = [
                {'product_name': 'iPhone 15 Pro Max', 'count': 18, 'current_price': '₹1,34,999', 'id': 1},
                {'product_name': 'Sony WH-1000XM5 Headphones', 'count': 12, 'current_price': '₹24,990', 'id': 2},
                {'product_name': 'iPad Air M1 64GB WiFi', 'count': 9, 'current_price': '₹52,900', 'id': 3}
            ]

        context = {
            'stat_cards': stat_cards,
            'active_alerts': Watchlist.objects.filter(user=request.user, target_price__isnull=False).count(),
            'prediction': prediction_payload,
            'chart_seed': chart_seed,
            'ticker_alerts': ticker_alerts,
            'quick_buy_deals': quick_buy_deals,
            'recent_alerts': recent_alerts,
            'top_deals_today': top_deals,
            'most_tracked_products': most_tracked,
        }

        # Check if mobile request
        user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
        is_mobile = 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent

        if is_mobile or request.GET.get('mobile') == 'true':
            return render(request, 'dashboard/mobile_index.html', context)

        return render(request, 'dashboard/index.html', context)
    except Exception as e:
        logger.error(f"FATAL dashboard_home error: {e}", exc_info=True)
        return HttpResponse("A technical error occurred in the dashboard engine.", status=500)


@login_required
def visual_search_page(request):
    """Dedicated 'Search by Image' page — the premium Visual Search experience."""
    return render(request, 'dashboard/visual_search.html', {
        'active_alerts': Watchlist.objects.filter(user=request.user, target_price__isnull=False).count(),
    })


@login_required
def dashboard_deals(request):
    """
    Dedicated Deals Page View showing top discounts, trending, and highlights.
    """
    try:
        products_qs = Product.objects.filter(
            is_active=True,
            base_price__isnull=False,
            current_lowest_price__isnull=False,
            base_price__gt=0
        ).prefetch_related('prices')
        
        products_list = []
        for p in products_qs:
            discount_pct = float(((p.base_price - p.current_lowest_price) / p.base_price) * Decimal('100.0'))
            if discount_pct > 0:
                products_list.append((p, discount_pct))
                
        products_list.sort(key=lambda x: x[1], reverse=True)
        
        deals_data = []
        for p, pct in products_list[:30]:
            prices = list(p.prices.all())
            best_price = p.current_lowest_price
            best_store_name = "N/A"
            best_store_url = "#"
            thumbnail = ""
            for sp in prices:
                if sp.current_price == best_price:
                    best_store_name = sp.store_name
                    best_store_url = sp.product_url
                    thumbnail = sp.image_url
                    break
            if not thumbnail and prices:
                thumbnail = prices[0].image_url
                
            deals_data.append({
                'id': p.id,
                'name': p.name,
                'discount_percent': f"{pct:.1f}% OFF",
                'best_price': _format_rupees(best_price),
                'base_price': _format_rupees(p.base_price),
                'best_store_name': best_store_name,
                'best_store_url': best_store_url,
                'thumbnail': thumbnail or '/static/images/placeholder.png',
            })
            
        if not deals_data:
            deals_data = [
                {
                    'id': 1,
                    'name': 'Apple Watch Series 9',
                    'discount_percent': '15.2% OFF',
                    'best_price': '₹37,900',
                    'base_price': '₹44,900',
                    'best_store_name': 'Amazon',
                    'best_store_url': '#',
                    'thumbnail': '/static/images/placeholder.png',
                },
                {
                    'id': 2,
                    'name': 'MacBook Air M2 8GB/256GB',
                    'discount_percent': '12.5% OFF',
                    'best_price': '₹99,990',
                    'base_price': '₹1,14,900',
                    'best_store_name': 'Flipkart',
                    'best_store_url': '#',
                    'thumbnail': '/static/images/placeholder.png',
                }
            ]
            
        return render(request, 'dashboard/deals.html', {
            'deals': deals_data,
            'active_alerts': Watchlist.objects.filter(user=request.user, target_price__isnull=False).count(),
        })
    except Exception as e:
        logger.error(f"FATAL dashboard_deals error: {e}", exc_info=True)
        return HttpResponse("A technical error occurred in the deals engine.", status=500)


@login_required
def product_detail_page(request, id):
    product = get_object_or_404(
        Product.objects.select_related('category').prefetch_related(
            Prefetch('prices', queryset=StorePrice.objects.order_by('current_price'))
        ),
        id=id,
    )

    # Build store-level comparison data
    stores = []
    for sp in product.prices.all():
        stores.append({
            'name': sp.store_name,
            'price': sp.current_price,
            'price_display': _format_rupees(sp.current_price),
            'available': bool(getattr(sp, 'is_available', True)),
            'availability_label': 'In Stock' if getattr(sp, 'is_available', True) else 'Out of Stock',
            'last_updated': sp.last_updated,
            'product_url': sp.product_url,
            'image_url': sp.image_url,
        })

    stores_sorted = sorted(stores, key=lambda s: (0, s['price']) if s['price'] is not None else (1, Decimal('0')))

    current_lowest_price = product.current_lowest_price
    if current_lowest_price is None and stores_sorted:
        first_price = stores_sorted[0].get('price')
        if first_price is not None:
            current_lowest_price = first_price

    num_stores = len([s for s in stores_sorted if s.get('price') is not None])

    # Trigger background scrape if data is thin or stale
    last_sync = product.prices.order_by('-last_updated').first()
    stale_threshold = timezone.now() - timedelta(minutes=30)
    needs_refresh = (num_stores < 3) or (last_sync and last_sync.last_updated < stale_threshold)
    if needs_refresh:
        def _bg_scrape():
            try:
                s = ScraperService()
                s.scrape(product.name, limit=12)
            except Exception:
                pass
        threading.Thread(target=_bg_scrape, daemon=True).start()

    # Chart payload for price history timeline
    chart_payload = _chart_payload(product_id=id)

    # Historical metrics from PriceHistory
    history_qs = PriceHistory.objects.filter(store_price__product_id=product.id)
    lowest_price = highest_price = avg_price = None
    change_pct = None
    trend_label = product.trend_indicator or 'STABLE'

    if history_qs.exists():
        prices_list = list(history_qs.values_list('price', flat=True))
        try:
            lowest_price = min(prices_list)
            highest_price = max(prices_list)
            avg_price = sum(prices_list) / len(prices_list)
        except Exception:
            pass

        ordered = history_qs.order_by('recorded_at')
        first_point = ordered.first()
        last_point = ordered.last()
        if first_point and last_point and first_point.price:
            try:
                delta = Decimal(last_point.price) - Decimal(first_point.price)
                change_pct = (delta / Decimal(first_point.price)) * Decimal('100')
                if change_pct > 0:
                    trend_label = 'UP'
                elif change_pct < 0:
                    trend_label = 'DOWN'
                else:
                    trend_label = 'STABLE'
            except Exception:
                pass

    # Watchlist status
    is_watchlisted = False
    if request.user.is_authenticated:
        is_watchlisted = Watchlist.objects.filter(user=request.user, product=product).exists()

    insights = {
        'lowest_price_display': _format_rupees(lowest_price),
        'highest_price_display': _format_rupees(highest_price),
        'avg_price_display': _format_rupees(avg_price),
        'change_pct_display': f"{change_pct:.1f}%" if change_pct is not None else "N/A",
        'trend_label': trend_label,
    }

    chart_json = json.dumps(chart_payload)

    # Build bar chart data for store-vs-store price comparison
    bar_chart_data = {
        'stores': [s['name'] for s in stores_sorted if s.get('price') is not None],
        'prices': [float(s['price']) for s in stores_sorted if s.get('price') is not None],
    }
    bar_chart_json = json.dumps(bar_chart_data)

    stat_cards = [
        ("Current Lowest", _format_rupees(current_lowest_price), "text-brand-success", f"Across {num_stores} stores"),
        ("Peak Value", _format_rupees(highest_price), "text-brand-accent", "Historical Max"),
        ("Global Mean", _format_rupees(avg_price), "text-white", "Market Average"),
        ("Net Variance", insights['change_pct_display'], "text-brand-success" if trend_label == 'DOWN' else "text-brand-danger" if trend_label == 'UP' else "text-white", "Historical Delta"),
    ]

    context = {
        'product': product,
        'stores': stores_sorted,
        'current_lowest_price': current_lowest_price,
        'current_lowest_price_display': _format_rupees(current_lowest_price),
        'num_stores': num_stores,
        'trend_label': trend_label,
        'chart_json': chart_json,
        'bar_chart_json': bar_chart_json,
        'insights': insights,
        'is_watchlisted': is_watchlisted,
        'stat_cards': stat_cards,
    }
    return render(request, 'dashboard/product_details.html', context)



@login_required
def dashboard_watchlist(request):
    sort_option = request.GET.get('sort', 'newest')
    availability_filter = request.GET.get('availability', 'all')
    
    qs = Watchlist.objects.filter(user=request.user).select_related('product').prefetch_related(
        Prefetch('product__prices', queryset=StorePrice.objects.order_by('current_price'))
    )

    if sort_option == 'newest':
        qs = qs.order_by('-created_at')
    elif sort_option == 'price_low_high':
        qs = qs.order_by('product__current_lowest_price')
    elif sort_option == 'price_high_low':
        qs = qs.order_by('-product__current_lowest_price')

    items = []
    for entry in qs:
        product = entry.product
        if not product:
            continue

        prices = list(product.prices.all())
        in_stock_prices = [p for p in prices if getattr(p, 'is_available', True) and p.current_price]
        
        if availability_filter == 'in_stock' and not in_stock_prices:
            continue
        if availability_filter == 'out_of_stock' and in_stock_prices:
            continue

        current_price = product.current_lowest_price
        if not current_price and in_stock_prices:
            current_price = in_stock_prices[0].current_price

        if not current_price and prices:
            current_price = prices[0].current_price

        entry_price = entry.added_price
        target_price = entry.target_price

        # Computations
        trend_class = "text-white"
        trend_label = "STABLE"
        price_difference_display = "0"
        price_drop_percent = "0.0"

        if current_price and entry_price:
            diff = entry_price - current_price
            if diff > 0:
                trend_class = "text-brand-success"
                trend_label = "DOWN"
                price_difference_display = _format_rupees(diff)
                price_drop_percent = f"{(diff / entry_price * 100):.1f}"
            elif diff < 0:
                trend_class = "text-[#ff3366]"
                trend_label = "UP"
                price_difference_display = _format_rupees(abs(diff))
                price_drop_percent = f"{(diff / entry_price * 100):.1f}"

        baseline_price = product.base_price or entry_price or current_price
        discount_percent = "0.0"
        baseline_drop_percent = "0.0"
        if baseline_price and current_price and baseline_price > current_price:
            bdiff = baseline_price - current_price
            baseline_drop_percent = f"{(bdiff / baseline_price * 100):.1f}"
            discount_percent = baseline_drop_percent

        best_store_name = "N/A"
        best_store_url = "#"
        if in_stock_prices:
            best_store_name = in_stock_prices[0].store_name
            best_store_url = in_stock_prices[0].product_url
        elif prices:
            best_store_name = prices[0].store_name
            best_store_url = prices[0].product_url

        store_breakdown = []
        for i, p in enumerate(prices):
            if p.current_price:
                store_breakdown.append({
                    'name': p.store_name,
                    'price_display': _format_rupees(p.current_price),
                    'is_best': i == 0
                })

        product_image_url = ""
        if in_stock_prices and in_stock_prices[0].image_url:
            product_image_url = in_stock_prices[0].image_url
        elif prices and prices[0].image_url:
            product_image_url = prices[0].image_url

        item_data = {
            'id': product.id,
            'uuid': str(entry.uuid),
            'best_store_name': best_store_name,
            'store_count': len(prices),
            'product_image': product_image_url,
            'product_name': product.name,
            'last_updated': product.updated_at,
            'current_price_display': _format_rupees(current_price),
            'entry_price_display': _format_rupees(entry_price),
            'trend_class': trend_class,
            'trend_label': trend_label,
            'price_difference_display': price_difference_display,
            'price_drop_percent': price_drop_percent,
            'discount_percent': discount_percent,
            'baseline_price_display': _format_rupees(baseline_price),
            'baseline_drop_percent': baseline_drop_percent,
            'target_reached': bool(target_price and current_price and current_price <= target_price),
            'was_out_of_stock': len(in_stock_prices) == 0,
            'best_store_url': best_store_url,
            'target_price_value': str(target_price) if target_price else '',
            'store_breakdown': store_breakdown[:3]  # top 3
        }
        items.append(item_data)

    context = {
        'items': items,
        'sort_options': [('newest', 'Date Added (Newest)'), ('price_low_high', 'Price (Low to High)'), ('price_high_low', 'Price (High to Low)')],
        'availability_filters': [('all', 'All Statuses'), ('in_stock', 'In Stock First'), ('out_of_stock', 'Out of Stock')],
        'sort_option': sort_option,
        'availability_filter': availability_filter
    }
    return render(request, 'dashboard/watchlist.html', context)

@login_required
@require_POST
def watchlist_remove(request, uuid):
    item = get_object_or_404(Watchlist, uuid=uuid, user=request.user)
    product_name = item.product.name
    item.delete()
    messages.success(request, f"{product_name} removed from your watchlist.")
    return redirect('dashboard:watchlist')


@login_required
@require_POST
def watchlist_update_target(request, uuid):
    watchlist_item = get_object_or_404(Watchlist, uuid=uuid, user=request.user)
    price_value = request.POST.get('target_price')

    update_fields = ['target_price', 'last_notified_price']
    if price_value:
        try:
            target_price = Decimal(price_value)
            if target_price <= 0:
                raise InvalidOperation()
            watchlist_item.target_price = target_price
            messages.success(request, "Target price updated.")
        except (InvalidOperation, ValueError):
            messages.error(request, "Enter a valid target price.")
            return redirect('dashboard:watchlist')
    else:
        watchlist_item.target_price = None
        messages.success(request, "Target price cleared.")

    watchlist_item.last_notified_price = None
    watchlist_item.save(update_fields=update_fields)
    return redirect('dashboard:watchlist')


@login_required
def dashboard_alerts(request):
    active_alerts = (
        Watchlist.objects
        .filter(user=request.user, target_price__isnull=False)
        .select_related('product')
        .order_by('-created_at')
    )
    logs = (
        NotificationLog.objects
        .filter(user=request.user)
        .order_by('-intent_timestamp')[:30]
    )
    return render(
        request,
        'dashboard/alerts.html',
        {
            'active_alerts': active_alerts,
            'logs': logs,
        },
    )


@login_required
@require_POST
def set_price_alert_from_product(request):
    product_id = request.POST.get('product_id')
    target_value = request.POST.get('target_price')

    if not product_id:
        messages.error(request, "Product is required to set an alert.")
        return redirect('dashboard:alerts')

    product = get_object_or_404(Product, id=product_id)

    try:
        target_price = Decimal(target_value)
        if target_price <= 0:
            raise InvalidOperation()
    except (InvalidOperation, TypeError, ValueError):
        messages.error(request, "Enter a valid alert price.")
        return redirect('dashboard:alerts')

    current_price = product.current_lowest_price
    watchlist_item, _ = Watchlist.objects.get_or_create(
        user=request.user,
        product=product,
        defaults={
            'added_price': current_price,
            'last_recorded_price': current_price,
        },
    )

    watchlist_item.target_price = target_price
    watchlist_item.last_notified_price = None
    watchlist_item.save(update_fields=['target_price', 'last_notified_price'])

    messages.success(
        request,
        f"Alert set for {product.name} at ₹{target_price}.",
    )
    return redirect('dashboard:alerts')


@login_required
def api_products(request):
    """HTMX endpoint returning table rows for products."""
    products = (
        Product.objects.filter(is_active=True)
        .prefetch_related(
            Prefetch('prices', queryset=StorePrice.objects.order_by('store_name'))
        )
        .order_by('-updated_at')[:10]
    )

    product_list: List[Dict[str, Any]] = []
    for product in products:
        prices = list(product.prices.all())
        numeric_prices = [p.current_price for p in prices if p.current_price is not None]
        min_value = min(numeric_prices) if numeric_prices else None

        status = product.trend_indicator or 'LIVE'
        delta_label = 'STABLE_00'
        if len(numeric_prices) >= 2:
            delta_amount = Decimal(numeric_prices[0]) - Decimal(numeric_prices[1])
            if delta_amount:
                prefix = 'DROP' if delta_amount > 0 else 'RISE'
                magnitude = abs(delta_amount)
                magnitude_label = (
                    f"{magnitude / Decimal('1000'):.1f}K"
                    if magnitude >= 1000
                    else f"{magnitude:.0f}"
                )
                delta_label = f"{prefix}_{magnitude_label}"

        if not prices:
            product_list.append({
                'id': product.id,
                'name': product.name.upper()[:30],
                'store': 'N/A',
                'price': 'N/A',
                'min': 'N/A',
                'delta': 'STABLE_00',
                'status': status,
            })
            continue

        cheapest_store_url = None
        for sp in prices:
            if sp.current_price == min_value and sp.product_url:
                cheapest_store_url = sp.product_url

        for sp in prices:
            product_list.append({
                'id': product.id,
                'name': product.name.upper()[:30],
                'store': sp.store_name.upper(),
                'price': _format_rupees(sp.current_price),
                'min': _format_rupees(min_value),
                'delta': delta_label,
                'status': status,
                'buy_url': cheapest_store_url or sp.product_url or '#',
            })

    if not product_list:
        product_list = [
            {'id': 1, 'name': 'IPHONE-14-128-BLK', 'store': 'AMAZON', 'price': '₹61,499', 'min': '₹61,499', 'delta': 'DROP_1.5K', 'status': 'LIVE'},
        ]

    # Check if mobile request
    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
    is_mobile = 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent

    if is_mobile or request.GET.get('mobile') == 'true':
        return render(request, 'dashboard/partials/mobile_price_table.html', {'products': product_list})

    return render(request, 'dashboard/partials/product_rows.html', {'products': product_list})


@login_required
def api_product_history(request, id):
    period = request.GET.get('period', '7d')
    chart_payload = _chart_payload(product_id=id, period=period)

    view_mode = request.GET.get('view') or request.GET.get('mode')
    is_htmx = request.headers.get('HX-Request') == 'true'

    if is_htmx and view_mode == 'panel':
        try:
            product = get_object_or_404(
                Product.objects.select_related('category').prefetch_related(
                    Prefetch('prices', queryset=StorePrice.objects.order_by('current_price'))
                ),
                id=id,
            )
        except Exception:
            return HttpResponse('<div class="px-4 py-4 text-center text-red-400 font-mono text-xs">Error loading product</div>')

        stores = []
        for sp in product.prices.all():
            stores.append({
                'name': sp.store_name,
                'price': sp.current_price,
                'price_display': _format_rupees(sp.current_price),
                'available': bool(getattr(sp, 'is_available', True)),
                'availability_label': 'In Stock' if getattr(sp, 'is_available', True) else 'Out of Stock',
                'last_updated': sp.last_updated,
                'product_url': sp.product_url,
            })

        stores_sorted = sorted(stores, key=lambda s: (0, s['price']) if s['price'] is not None else (1, Decimal('0')))
        current_lowest_price = product.current_lowest_price
        num_stores = len([s for s in stores_sorted if s.get('price') is not None])

        context = {
            'product': product,
            'stores': stores_sorted,
            'current_lowest_price_display': _format_rupees(current_lowest_price),
            'num_stores': num_stores,
            'trend_label': product.trend_indicator or 'STABLE',
            'chart_json': json.dumps(chart_payload),
            'insights': {
                'lowest_price_display': _format_rupees(current_lowest_price),
                'highest_price_display': 'N/A',
                'avg_price_display': 'N/A',
                'change_pct_display': 'N/A',
                'trend_label': product.trend_indicator or 'STABLE',
            },
            'is_watchlisted': Watchlist.objects.filter(user=request.user, product=product).exists() if request.user.is_authenticated else False,
        }
        return render(request, 'dashboard/partials/product_detail_panel.html', context)

    return JsonResponse(chart_payload)


@login_required
def api_watchlist(request):
    """HTMX endpoint for watchlist panel."""
    items = _watchlist_items(request.user if request else None)

    # Check if mobile request
    user_agent = request.META.get('HTTP_USER_AGENT', '').lower()
    is_mobile = 'mobile' in user_agent or 'android' in user_agent or 'iphone' in user_agent

    if is_mobile or request.GET.get('mobile') == 'true':
        return render(request, 'dashboard/partials/mobile_watchlist.html', {'items': items})

    return render(request, 'dashboard/partials/watchlist_items.html', {'items': items})


@login_required
def api_system_health(request):
    """HTMX endpoint for system health."""
    context = _system_health_snapshot()
    return render(request, 'dashboard/partials/system_health_content.html', context)


@login_required
@require_http_methods(["GET", "POST"])
def api_search(request):
    """HTMX endpoint for universal search with pagination."""
    query = (request.POST.get('q') or request.GET.get('q', '')).strip()
    page_number = request.GET.get('page') or request.POST.get('page') or 1

    if not query:
        return render(request, 'dashboard/partials/search_results.html', {'query': '', 'results': []})

    cleaned = normalize_query(query)
    clean_q = cleaned.get('clean') or query
    is_htmx = request.headers.get('HX-Request') == 'true'

    cache_key = f"search_results_{clean_q.replace(' ', '_').lower()}"
    results_data = cache.get(cache_key)

    try:
        if not results_data:
            service = ScraperService()
            scrape_results = service.scrape(clean_q, limit=18)

            if not scrape_results:
                error_msg = service.last_error or 'Price data unavailable.'
                if is_htmx:
                    return HttpResponse(
                        f'<tr><td colspan="6" class="px-4 py-4 text-center text-[#ff99b5]">{error_msg}</td></tr>',
                    )
                return render(request, 'dashboard/partials/search_results.html', {'query': clean_q, 'results': [], 'error': error_msg})

            persisted = service.persist_results(clean_q, cleaned.get('raw'), scrape_results)
            product = persisted.get('product')
            rows = persisted.get('rows', [])

            results_data = {
                'rows': rows,
                'chart_id': product.id if product else None
            }
            cache.set(cache_key, results_data, 600)

        rows = results_data.get('rows', [])
        chart_id = results_data.get('chart_id')

        paginator = Paginator(rows, 6)
        page_obj = paginator.get_page(page_number)

        chart_script = ""
        if str(page_number) == "1" or page_number == 1:
            chart = _chart_payload(product_id=chart_id) if chart_id else {}
            if chart.get('series'):
                chart_script = """
<script>
if(window.ApexCharts){
    try{
        ApexCharts.exec('priceHistoryChart', 'updateSeries', %s);
        ApexCharts.exec('priceHistoryChart', 'updateOptions', { xaxis: { categories: %s } });
    }catch(e){ console.error('chart update', e); }
}
</script>
""" % (json.dumps(chart.get('series', [])), json.dumps(chart.get('categories', [])))

        layout = request.POST.get('layout') or request.GET.get('layout')
        if is_htmx and layout != 'panel':
            html = render(request, 'dashboard/partials/product_rows.html', {'products': page_obj, 'query': clean_q}).content.decode('utf-8')
            return HttpResponse(html + chart_script)

        context = {
            'query': clean_q,
            'results': page_obj,
            'chart_script': chart_script,
        }
        return render(request, 'dashboard/partials/search_results.html', context)

    except Exception as exc:
        logger.exception('api_search failure')
        return render(request, 'dashboard/partials/search_results.html', {'query': clean_q, 'results': [], 'error': str(exc)})


# --- Image Search Helpers ---

def _get_task(task_id: str) -> Dict[str, Any]:
    return cache.get(f"image_task:{task_id}") or {}

def _update_task(task_id: str, data: Dict[str, Any]):
    current = _get_task(task_id)
    current.update(data)
    cache.set(f"image_task:{task_id}", current, 3600)


def _perform_visual_identification(path: str) -> str:
    """Helper to perform Strategy 1 (Lens) and Strategy 2 (OCR) in the background."""
    recognized_query = ""

    # Strategy 1: SerpAPI Google Lens
    try:
        SERPAPI_API_KEY = getattr(settings, 'SERPAPI_API_KEY', '') or os.getenv('SERPAPI_API_KEY', '')
        if SERPAPI_API_KEY:
            public_url = None
            try:
                with open(path, 'rb') as img_file:
                    img_b64 = base64.b64encode(img_file.read()).decode('utf-8')

                upload_resp = requests.post(
                    'https://freeimage.host/api/1/upload',
                    data={'key': '6d207e02198a847aa98d0a2a901485a5', 'source': img_b64, 'format': 'json'},
                    timeout=20
                )
                if upload_resp.status_code == 200:
                    public_url = upload_resp.json().get('image', {}).get('url')

                if not public_url:
                    upload_resp = requests.post(
                        'https://api.imgbb.com/1/upload',
                        data={'key': '65239e94444586d11b33345426f8d02c', 'image': img_b64},
                        timeout=20
                    )
                    public_url = upload_resp.json().get('data', {}).get('url') if upload_resp.status_code == 200 else None

                if not public_url:
                    cat_resp = requests.post('https://catbox.moe/user/api.php', data={'reqtype': 'fileupload'}, files={'fileToUpload': open(path, 'rb')}, timeout=20)
                    if cat_resp.status_code == 200 and cat_resp.text.startswith('http'):
                        public_url = cat_resp.text.strip()
            except Exception as e:
                logger.error('Background identification upload failed: %s', e)

            if public_url:
                lens_params = {'engine': 'google_lens', 'url': public_url, 'api_key': SERPAPI_API_KEY, 'hl': 'en', 'gl': 'in'}
                lens_resp = requests.get('https://serpapi.com/search.json', params=lens_params, timeout=25)
                if lens_resp.status_code == 200:
                    lens_data = lens_resp.json()
                    logger.info('Google Lens results keys: %s', list(lens_data.keys()))

                    knowledge = lens_data.get('knowledge_graph', {})
                    if isinstance(knowledge, list) and knowledge:
                        recognized_query = knowledge[0].get('title', '')
                    elif isinstance(knowledge, dict):
                        recognized_query = knowledge.get('title', '') or knowledge.get('name', '')

                    if not recognized_query:
                        reverse = lens_data.get('reverse_image_search', {})
                        if isinstance(reverse, dict):
                            recognized_query = reverse.get('search_link_text')

                    if not recognized_query:
                        visual_matches = lens_data.get('visual_matches', [])
                        if visual_matches:
                            recognized_query = visual_matches[0].get('title', '')

                    if not recognized_query:
                        related = lens_data.get('related_searches', [])
                        if related:
                            recognized_query = related[0].get('query', '')
    except Exception as e:
        logger.error('Background Lens identification failed: %s', e)

    # Strategy 2: Tesseract OCR Fallback
    if not recognized_query or len(recognized_query.strip()) < 3:
        try:
            import pytesseract
            from PIL import Image
            img = Image.open(path)
            tesseract_path = getattr(settings, 'TESSERACT_CMD', None)
            if tesseract_path:
                pytesseract.pytesseract.tesseract_cmd = tesseract_path
            raw_text = pytesseract.image_to_string(img)
            if raw_text and len(raw_text.strip()) > 3:
                recognized_query = raw_text
        except Exception:
            pass

    return recognized_query


def _simulate_image_workflow(task_id: str, image_path: str, initial_ocr: str = '') -> None:
    """Consolidated background worker: Identify -> Clean -> Scrape -> Persist."""
    try:
        logger.info('[TASK %s] Starting background image workflow. Path: %s', task_id, image_path)

        # Step 1: Visual Identification
        query = initial_ocr
        if not query or len(query.strip()) < 3:
            logger.info('[TASK %s] Identification stage START (Lens/OCR).', task_id)
            query = _perform_visual_identification(image_path)
            if not query:
                query = os.path.basename(image_path)
                logger.warning('[TASK %s] Identification stage FAILED. Falling back to filename: %s', task_id, query)
            else:
                logger.info('[TASK %s] Identification stage SUCCESS. Identified: %s', task_id, query)

        cleaned = normalize_query(query)
        clean_q = cleaned.get('clean', '').strip()

        if not clean_q or len(clean_q) < 3:
            logger.warning('[TASK %s] Identification failed to produce a valid query. Aborting.', task_id)
            _update_task(task_id, {'status': 'FAILURE', 'error': 'Could not recognize any product in this image. Please try a clearer photo with visible text.'})
            return

        _update_task(task_id, {'query': clean_q})

        # Step 2: Search/Scrape
        logger.info('[TASK %s] Scraper stage START. Query: %s', task_id, clean_q)
        service = ScraperService()
        results = service.scrape(clean_q)

        if not results:
            msg = service.last_error or 'Price data unavailable via SerpAPI.'
            logger.warning('[TASK %s] Scraper stage FAILED. Msg: %s', task_id, msg)
            _update_task(task_id, {'status': 'FAILURE', 'error': msg})
            return

        logger.info('[TASK %s] Scraper stage SUCCESS. Results: %d', task_id, len(results))
        persisted = service.persist_results(clean_q, cleaned.get('raw'), results)
        product = persisted.get('product')
        chart = _chart_payload(product_id=product.id) if product else {}

        _update_task(task_id, {
            'status': 'SUCCESS',
            'results': persisted.get('rows', []),
            'chart': chart,
            'error': None
        })
        logger.info('[TASK %s] Workflow COMPLETE.', task_id)
    except Exception as exc:
        logger.exception('[TASK %s] UNEXPECTED FATAL ERROR.', task_id)
        _update_task(task_id, {'status': 'FAILURE', 'error': str(exc)})


@login_required
def api_image_search(request):
    """Accepts an uploaded image and returns a task id for polling."""
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)

    upload = request.FILES.get('image')
    if not upload:
        return JsonResponse({'error': 'no file'}, status=400)

    allowed_types = {'image/png', 'image/jpeg', 'image/webp'}
    if upload.content_type not in allowed_types:
        return JsonResponse({'error': 'unsupported file type'}, status=400)
    if upload.size and upload.size > 5 * 1024 * 1024:
        return JsonResponse({'error': 'file too large'}, status=400)

    media_root = getattr(settings, 'MEDIA_ROOT', None) or os.path.join(os.getcwd(), 'tmp')
    os.makedirs(media_root, exist_ok=True)
    filename = f"img_{uuid.uuid4().hex[:8]}.png"
    path = os.path.join(media_root, filename)
    with open(path, 'wb') as fh:
        for chunk in upload.chunks():
            fh.write(chunk)

    task_id = uuid.uuid4().hex
    _update_task(task_id, {'status': 'PENDING', 'results': [], 'chart': {}, 'error': None, 'query': ''})

    # Try Celery first, fall back to thread
    try:
        from apps.dashboard.tasks import image_search_task
        image_search_task.apply_async(args=(path, None), task_id=task_id)
        _update_task(task_id, {'celery_id': task_id})
    except Exception as e:
        logger.warning("Celery dispatch failed, falling back to local thread: %s", e)
        t = threading.Thread(target=_simulate_image_workflow, args=(task_id, path), daemon=True)
        t.start()

    is_htmx = request.headers.get('HX-Request') == 'true' or request.META.get('HTTP_HX_REQUEST') == 'true'
    if is_htmx:
        return render(request, 'dashboard/partials/image_loading.html', {'task_id': task_id}, status=202)

    return JsonResponse({'task_id': task_id}, status=202)


@login_required
def api_result(request, task_id):
    """Poll endpoint for image workflow results."""
    task = _get_task(task_id)
    if not task:
        return JsonResponse({'status': 'FAILURE', 'error': 'Task ID not recognized'}, status=404)

    # Check Celery result if not already successful
    if task.get('status') != 'SUCCESS':
        celery_id = task.get('celery_id') or task_id
        try:
            from celery.result import AsyncResult
            res = AsyncResult(celery_id)
            if res.ready():
                data = res.result or {}
                if isinstance(data, dict):
                    task.update({
                        'status': 'SUCCESS' if res.status == 'SUCCESS' else 'FAILURE',
                        'results': data.get('results', []),
                        'chart': data.get('chart', {}),
                        'query': data.get('clean_query') or task.get('query', ''),
                        'error': data.get('error') or (str(data) if res.status == 'FAILURE' else None)
                    })
                    _update_task(task_id, task)
        except Exception as e:
            logger.debug("Celery result check failed for %s: %s", task_id, e)

    status_val = task.get('status', 'PENDING')
    query = task.get('query', '')

    panel_html = ""
    if status_val == 'SUCCESS':
        from django.template.loader import render_to_string
        panel_html = render_to_string('dashboard/partials/search_results.html', {
            'query': query,
            'results': task.get('results', [])
        })

    payload = {
        'status': status_val,
        'product_name': query,
        'results': task.get('results', []),
        'chart': task.get('chart', {}),
        'error': task.get('error'),
        'panel_html': panel_html
    }
    return JsonResponse(payload)


@login_required
def api_image_search_form(request):
    return render(request, 'dashboard/partials/image_upload_card.html')


@login_required
@require_http_methods(["POST"])
def api_activate_dip_alert(request):
    product_id = request.POST.get('product_id')

    if not product_id:
        product = Product.objects.order_by('-updated_at').first()
    else:
        product = Product.objects.filter(id=product_id).first()

    if not product:
        return HttpResponse(
            '<div class="text-[#ff99b5] text-xs font-mono p-2 text-center">No product found.</div>',
            status=400
        )

    current_price = product.current_lowest_price
    if not current_price or current_price <= 0:
        sp = StorePrice.objects.filter(product=product, current_price__gt=0).order_by('current_price').first()
        current_price = sp.current_price if sp else None

    if not current_price:
        return HttpResponse(
            '<div class="text-[#ff99b5] text-xs font-mono p-2 text-center">No price data available.</div>',
            status=400
        )

    drop_pct = Decimal('0.10')
    target_price = (current_price * (1 - drop_pct)).quantize(Decimal('0.01'))

    watchlist_item, created = Watchlist.objects.get_or_create(
        user=request.user,
        product=product,
        defaults={
            'added_price': current_price,
            'last_recorded_price': current_price,
            'target_price': target_price,
        },
    )

    if not created:
        watchlist_item.target_price = target_price
        watchlist_item.last_recorded_price = current_price
        watchlist_item.last_notified_price = None
        watchlist_item.save(update_fields=['target_price', 'last_recorded_price', 'last_notified_price'])

    formatted_target = f"₹{int(target_price):,}"
    formatted_current = f"₹{int(current_price):,}"

    html = f'''
    <div class="w-full mt-6 p-4 border border-emerald-250 dark:border-emerald-900/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 text-xs rounded-2xl text-center space-y-2">
        <div class="font-bold flex items-center justify-center gap-1.5 uppercase tracking-wider text-emerald-600 dark:text-emerald-400"><i class="fas fa-bell"></i> Dip Alert Configured</div>
        <div class="text-[11px] text-slate-500 dark:text-zinc-400 leading-normal">
            Watching <span class="font-bold text-slate-900 dark:text-white">{product.name[:35]}</span><br>
            Trigger target: <span class="font-extrabold text-emerald-600 dark:text-emerald-400">{formatted_target}</span>
            <span class="text-[10px] text-slate-400 dark:text-zinc-500">(current: {formatted_current})</span>
        </div>
    </div>
    '''
    return HttpResponse(html)
