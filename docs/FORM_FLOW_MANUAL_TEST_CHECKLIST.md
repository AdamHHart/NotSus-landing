# Form Flow Manual Test Checklist

Use this checklist to quickly validate the two form flows on the landing page:
- Download email verification flow (`feedbackForm`)
- Waitlist flow (`waitlistForm`)

## Setup

- [ ] Start the app locally (frontend + backend).
- [ ] Open `index.html` through your normal local URL.
- [ ] Open browser devtools Console and Network tabs.

## 1) Valid Email Path

### Download flow (`feedbackForm`)
- [ ] Enter a valid email in the download form.
- [ ] Click `Download Now`.
- [ ] Confirm one `POST /api/feedback` request is sent.
- [ ] Confirm request payload includes `name`, `email`, `concerns`, `gains`, `otherDescription`, `gainsDescription`, `timestamp`.
- [ ] Confirm button text changes to `Submitting...` while request is in progress.

### Waitlist flow (`waitlistForm`)
- [ ] Complete waitlist steps until final submit.
- [ ] Click final `Submit`.
- [ ] Confirm one `POST /api/feedback` request is sent.
- [ ] Confirm payload shape matches the expected fields above.
- [ ] Confirm thank-you section appears after success.

## 2) API Error Path

Use one of these methods:
- Stop backend temporarily, or
- Return an intentional non-2xx response from `/api/feedback`.

### Download + Waitlist
- [ ] Submit each form once while API is failing.
- [ ] Confirm submit button shows `Error - Try Again`.
- [ ] Confirm button is re-enabled.
- [ ] Confirm original button text returns after ~2 seconds.
- [ ] Confirm no success/thank-you/download state is shown.

## 3) Verification-Required Path (Download flow)

Expected API response should include one of:
- `requireVerification: true`, or
- `message: "check_email"`

### Download flow (`feedbackForm`)
- [ ] Submit with valid email.
- [ ] Confirm form step is hidden.
- [ ] Confirm `check-email-section` becomes visible.
- [ ] Confirm entered email appears in the check-email message.
- [ ] Confirm `download-section` does **not** appear immediately.

## Optional: Verified Link Return Path

- [ ] Open page with `?download_token=<token>` in URL.
- [ ] Confirm download section appears automatically.
- [ ] Confirm URL is cleaned (token removed from address bar after load).
- [ ] Confirm download buttons include tokenized links (`/download/<platform>?token=...`).

