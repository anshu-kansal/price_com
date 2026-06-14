from allauth.socialaccount.adapter import DefaultSocialAccountAdapter
from allauth.account.models import EmailAddress
from django.contrib.auth import get_user_model

User = get_user_model()


class SocialAccountAdapter(DefaultSocialAccountAdapter):
    def is_open_for_signup(self, request, sociallogin):
        # allow automatic social user provisioning and skip extra user form
        return True

    def pre_social_login(self, request, sociallogin):
        """
        Auto-connect social login to an existing account with the same email.
        This prevents the 'account already exists' error when a user signs up
        manually first, then tries Google login later.
        """
        # If this social account is already linked, nothing to do
        if sociallogin.is_existing:
            return

        # Try to get email from the social provider
        email = None
        if sociallogin.account.extra_data.get('email'):
            email = sociallogin.account.extra_data['email']
        elif sociallogin.email_addresses:
            email = sociallogin.email_addresses[0].email

        if not email:
            return

        # Check if a user with this email already exists
        try:
            existing_user = User.objects.get(email=email)
        except User.DoesNotExist:
            # No existing user, let allauth create a new one
            sociallogin.user.email = email
            if not getattr(sociallogin.user, 'username', None):
                sociallogin.user.username = email.split('@')[0]
            return

        # Auto-connect: Link the social account to the existing user
        sociallogin.connect(request, existing_user)
