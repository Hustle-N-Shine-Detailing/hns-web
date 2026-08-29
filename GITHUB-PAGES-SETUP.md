# GitHub Pages Configuration for Hustle & Shine

## Setup Instructions

Your website is hosted on GitHub Pages. To make it accessible:

### Current Setup
- Repository: `Hustle-N-Shine-Detailing/hns-web`
- Domain: `hustlenshine.pro`
- CNAME file: ✅ Configured

### What You Need to Do (IMPORTANT!)

**If you own `hustlenshine.pro`:**

1. **Go to your domain registrar** (GoDaddy, Namecheap, etc.)
2. **Add a DNS record:**
   - Type: `CNAME`
   - Name: `www`
   - Value: `Hustle-N-Shine-Detailing.github.io`

3. **Or use these A records for apex domain:**
   - `185.199.108.153`
   - `185.199.109.153`
   - `185.199.110.153`
   - `185.199.111.153`

4. **Wait 5-48 hours** for DNS to propagate

5. **In GitHub repository settings > Pages:**
   - Verify custom domain shows `hustlenshine.pro`
   - Enable "Enforce HTTPS" (once DNS is live)

### Testing
```bash
# Check if DNS is configured correctly
dig www.hustlenshine.pro +nostats +nocomments +nocmd
# Should see CNAME pointing to Hustle-N-Shine-Detailing.github.io
```

---

**Still having issues?** Check: [GitHub Pages Troubleshooting](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)
