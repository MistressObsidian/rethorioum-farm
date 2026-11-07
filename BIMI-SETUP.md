# BIMI Setup

Use the prepared logo file at `https://rethorioum-farm.pages.dev/bimi.svg` for BIMI publication.

The website currently uses the Cloudflare Pages address above. The DNS example below applies to the custom email domain when it is activated.

Recommended DNS record:

```txt
default._bimi.rethoriumfarm.com IN TXT "v=BIMI1; l=https://rethorioum-farm.pages.dev/bimi.svg; a="
```

Requirements before BIMI will display in supported inboxes:

- DMARC must be enabled for the sending domain with `p=quarantine` or `p=reject`.
- SPF and DKIM must both pass for the mail stream using the domain.
- `bimi.svg` must stay publicly reachable over HTTPS and be served as `image/svg+xml`.

Optional hardening:

- Replace the empty `a=` value with a Verified Mark Certificate URL when you obtain a VMC.