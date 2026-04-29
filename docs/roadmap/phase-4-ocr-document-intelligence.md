# Phase 4 - OCR And Document Intelligence Service

Status: Implemented baseline; scanned-PDF rasterization remains hardening work.

## Source Templates

Local template source folder:

`C:\Users\fahme\Downloads\V-AXIS\Templates`

These files are reference material only. They should not be committed until each sample is approved for retention, sanitized, and cleared for privacy/commercial use.

## Current Implementation

- Added a backend OCR intelligence module that classifies extracted text into V-AXIS document families.
- Added field extraction profiles for ARAMCO, Iqama/Saudi ID, GOSI, ZATCA/VAT, Chamber, Commercial Registration, Baladiyah/MOMRA, National Address, Local Content, Saudi Council of Engineers, Insurance, Work Permit, and generic administrative assets.
- Added a protected `POST /api/v1/documents/ocr-preview` endpoint for PDF, PNG, JPEG, and JPG uploads.
- Added a real product frontend OCR Preview action under `/app` Documents.
- Added a review panel that shows document type, confidence, extracted fields, missing required fields, warnings, and editable extracted values.
- Added persisted OCR extraction records with `QUEUED`, `PROCESSING`, `READY`, `NEEDS_REVIEW`, `APPROVED`, and `FAILED` lifecycle states.
- Uploading or replacing a document now creates an OCR extraction record and queues an OCR worker job.
- Added an OCR worker path on the `vaxis-ocr` queue.
- Added retry controls for failed or review-needed OCR jobs.
- Added approval controls that apply corrected OCR values back to the document registry and refresh governance.
- Added audit events for OCR queued, completed, failed, retried, and approved.
- Added text-based PDF extraction using the PDF text layer before falling back to image OCR warnings.
- Kept `/demo` untouched.

## Template Inventory

| Folder | Template files found | Extraction profile |
| --- | --- | --- |
| ARAMCO | `700212851-Saudi-Aramco-Approval-Letter.pdf`, `712673735-Aramco-Letter.pdf`, `ARAMCO_Registration_Approval_Letter.jpg`, `ARAMCO_Registration_Approval_Letter_2.jpg` | ARAMCO Supplier Approval |
| Chamber of commerce | `ASHARQIA_Chamber_Subscription_Certificate.jpg`, `Saudi Business Center.png`, Arabic subscription PDF | Chamber of Commerce Certificate |
| Commercial Registration | Branch registration PNG, MoC shareholding company certificate JPG, `PAC CrCertificate.pdf` | Commercial Registration, Branch Registration |
| GOSI | salary certificate JPG, corporate certificate PDF/JPG, occupational safety PNG | GOSI Establishment, GOSI Employee |
| Local Content | `Local_Content_Certificate.jpg` | Local Content Certificate |
| MOI-Jawazat | Iqama templates, Saudi ID front/back templates | Iqama, Saudi ID |
| MOMRA | `BALADY_Commercial_Activity_License.jpg`, MOMRA classification JPG | Baladiyah License, MOMRA Classification |
| National Address | National address proof JPG/PDF | National Address Proof |
| QIWA | `Qiwa_Saudization_Certificate_Arabic.jpg` | Work Permit / Qiwa administrative asset |
| Saudi Council of Engineers | engineer card/certificate JPGs | Saudi Council of Engineers |
| ZATCA - VAT | VAT certificate JPGs, ZATCA registration JPG, Arabic Zakat/VAT PDFs | ZATCA Certificate, VAT Registration Certificate |

## Accepted Fields

The first extraction profiles cover the accepted fields supplied for:

- ARAMCO supplier approval.
- Iqama and Saudi ID.
- GOSI establishment and employee records.
- ZATCA and VAT certificates.
- Chamber of Commerce certificates.
- Commercial Registration and branch registration.
- Generic fallback: name, CR number, document number, issue date, and expiry date.

## Known Gaps

- Image-only/scanned PDFs still need server-side page rasterization before Tesseract can read page images reliably.
- The first extraction profiles are rule-based and should be tuned against more real samples.
- The approval mapper applies the main registry fields first: title/name, CR number, company identifier, issue date, and expiry date. Deeper per-template fields should move into dedicated metadata columns or JSON storage when the registry model is expanded.

## Next Slice

1. Add scanned-PDF rasterization so `image-only PDF -> page images -> OCR` works on Render.
2. Tune extraction rules with more real samples per authority.
3. Expand the registry metadata model for all extracted template-specific fields.
4. Add OCR quality dashboards by document family.
