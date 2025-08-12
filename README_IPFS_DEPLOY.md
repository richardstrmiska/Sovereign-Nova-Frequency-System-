
# Sovereign Restoration Command Center — Deployment Guide

## 1) Build the site
This folder is already a static site.

## 2) Publish to IPFS (Web3.Storage)
- Zip the folder and upload to Web3.Storage, or use `w3up`.
- Note the root CID that is returned.

## 3) Point your `.brave` domain to IPFS
- In Unstoppable Domains, manage your domain.
- Add or edit the IPFS hash / content field to your site’s root CID.
- Save & wait a few minutes. Open `<yourname>.brave` in Brave.

## 4) Keep it updated
- Replace `/data/ledger.csv` with your latest ledger CSV.
- Replace `/img/seven_layer_map.png` if you regenerate the map.
- Commit the site to GitHub with the CID in the README for public notarization.

## 5) Optional: Stellar memo
- Send a 0.00001 XLM tx from your Lobstr wallet with a memo like:
  `Most High Command Center v1 — CID: <your CID>`
- That memo becomes an immutable timestamp on the Stellar ledger.
