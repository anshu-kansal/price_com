# Google OAuth Setup Guide for PriceCom

This guide walks you through setting up Google OAuth authentication for your PriceCom project. Users can now sign up and sign in using their Google accounts on the login and signup pages.

## Prerequisites

- Google Account
- Django project running with django-allauth installed (✅ Already configured in your PriceCom)
- Django admin access

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Click on the **Project** dropdown at the top
4. Click **NEW PROJECT**
5. Enter project name: `PriceCom` (or any name you prefer)
6. Click **CREATE**
7. Wait for the project to be created

---

## Step 2: Enable Google+ API

1. In the Google Cloud Console, go to **APIs & Services** > **Library**
2. Search for **Google+ API**
3. Click on it and press **ENABLE**
4. Wait for it to enable

---

## Step 3: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. If asked, click **CONFIGURE CONSENT SCREEN** first
   - Choose **External** user type
   - Click **CREATE**
   - Fill in:
     - **App name**: `PriceCom`
     - **User support email**: Your email
     - **Developer contact info**: Your email
   - Click **SAVE AND CONTINUE** through all screens
   - Click **BACK TO CREDENTIALS**

4. Click **+ CREATE CREDENTIALS** > **OAuth client ID** again
5. Select **Web application**
6. Name it: `PriceCom Web Client`
7. Under **Authorized redirect URIs**, add:
   ```
   http://127.0.0.1:8000/accounts/google/login/callback/
   http://localhost:8000/accounts/google/login/callback/
   ```
   (Add both for local testing)
8. Click **CREATE**
9. Copy the **Client ID** and **Client Secret** (you'll need these)

---

## Step 4: Add Credentials to Django Admin

### Method A: Django Admin (Recommended)

1. Start your Django development server:
   ```bash
   python manage.py runserver
   ```

2. Go to: `http://127.0.0.1:8000/admin/`

3. Log in with your superuser account (if you don't have one, create one):
   ```bash
   python manage.py createsuperuser
   ```

4. Navigate to: **Sites**
   - Edit the existing site with domain `example.com`
   - Change the domain to: `127.0.0.1:8000` (for local development)
   - Change the name to: `PriceCom`
   - Click **SAVE**

5. Navigate to: **Social applications** 
   - Click **ADD SOCIAL APPLICATION**
   - Fill in the form:
     - **Provider**: Google
     - **Name**: Google OAuth
     - **Client id**: (Paste the Client ID from Google Cloud Console)
     - **Secret key**: (Paste the Client Secret from Google Cloud Console)
     - **Sites**: Select `127.0.0.1:8000` (or your site)
   - Click **SAVE**

### Method B: Programmatic Setup (Optional)

If you prefer to set up via Django shell:

```python
python manage.py shell
```

```python
from django.contrib.sites.models import Site
from allauth.socialaccount.models import SocialApp

# Update or create site
site = Site.objects.get_or_create(id=1)[0]
site.domain = '127.0.0.1:8000'
site.name = 'PriceCom'
site.save()

# Create Google OAuth app
google_app = SocialApp.objects.create(
    provider='google',
    name='Google OAuth',
    client_id='YOUR_CLIENT_ID',
    secret='YOUR_CLIENT_SECRET'
)
google_app.sites.add(site)
google_app.save()

exit()
```

---

## Step 5: Test Google OAuth

1. Visit `http://127.0.0.1:8000/accounts/login/`
2. Click **"Sign in with Google"**
3. You should be redirected to Google's login page
4. After authentication, you'll be redirected back to PriceCom

---

## Troubleshooting

### Issue: "Redirect URI mismatch"
**Solution**: Make sure the redirect URIs in Google Cloud Console exactly match your Django site domain. For local testing, use:
```
http://127.0.0.1:8000/accounts/google/login/callback/
```

### Issue: No "Sign in with Google" button appears
**Solution**: 
1. Check that the Social Application was created in Django admin
2. Verify the site domain matches your current domain
3. Clear your browser cache and refresh

### Issue: User created but not logged in after Google auth
**Solution**: Make sure `SOCIALACCOUNT_AUTO_SIGNUP = True` in `config/settings.py` (already configured ✅)

### Issue: OAuth app not showing in Django admin
**Solution**:
1. Ensure you're logged in with a superuser
2. Check that you're in the correct site (Sites in Django admin)
3. Verify django-allauth is installed: `pip list | grep allauth`

---

## For Production Deployment

When deploying to production:

1. Update the **Authorized redirect URIs** in Google Cloud Console to match your production domain:
   ```
   https://yourdomain.com/accounts/google/login/callback/
   ```

2. Update the **Site** in Django admin:
   - Set domain to your production domain
   - Update the social application's site reference

3. Change `DEBUG = False` in `config/settings.py`

4. Update `ALLOWED_HOSTS` in settings to include your production domain

---

## Features Now Available

✅ Users can sign up with Google  
✅ Users can sign in with Google  
✅ User data (email, profile) auto-filled from Google  
✅ Seamless account linking if user has both email and Google account  

---

## Additional Configuration (Optional)

### Add GitHub OAuth
The settings already support GitHub. To enable it:

1. Go to GitHub Settings > Developer settings > OAuth Apps
2. Create a new OAuth App
3. Add the same redirect URI approach
4. Add to Django admin as "Social Application" with provider "GitHub"

### Customize Post-Login Redirect
Edit `config/settings.py`:
```python
LOGIN_REDIRECT_URL = '/dashboard/'  # Redirect after login
SOCIALACCOUNT_AUTO_SIGNUP = True     # Auto-create accounts
```

---

## Support

For more details, refer to:
- [django-allauth Documentation](https://django-allauth.readthedocs.io/)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)
