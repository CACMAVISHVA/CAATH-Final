# CAATH Portal Assist

This Chrome/Edge extension receives a one-time, 60-second login request from `caath.in`, opens the selected official government portal, and fills the username and password fields.

- It never clicks Login or Submit.
- CAPTCHA, OTP, consent and final submission always remain with the user.
- Credentials are held only in browser session storage and are deleted after the password is filled or the request expires.
- Only `caath.in` can initiate a request, and only the configured GST, Income Tax, MCA and TRACES domains can receive it.
