export type OcrDocumentKind =
  | "ARAMCO_SUPPLIER"
  | "IQAMA"
  | "SAUDI_ID"
  | "GOSI_ESTABLISHMENT"
  | "GOSI_EMPLOYEE"
  | "ZATCA_CERTIFICATE"
  | "VAT_CERTIFICATE"
  | "CHAMBER_CERTIFICATE"
  | "COMMERCIAL_REGISTRATION"
  | "BRANCH_REGISTRATION"
  | "BALADIYAH_LICENSE"
  | "MOMRA_CLASSIFICATION"
  | "NATIONAL_ADDRESS"
  | "LOCAL_CONTENT"
  | "SAUDI_COUNCIL_ENGINEERS"
  | "INSURANCE"
  | "WORK_PERMIT"
  | "GENERIC_ADMINISTRATIVE_ASSET";

export type OcrField = {
  key: string;
  label: string;
  value: string;
  confidence: number;
  status: "READY" | "LOW_CONFIDENCE";
  source: "label" | "pattern" | "generic";
};

export type OcrExtractionResult = {
  engine: string;
  languageHints: string[];
  rawText: string;
  documentKind: OcrDocumentKind;
  documentTypeLabel: string;
  overallConfidence: number;
  fields: OcrField[];
  missingRequiredFields: string[];
  requiresReview: boolean;
  warnings: string[];
  templateHints: string[];
};

type FieldSpec = {
  key: string;
  label: string;
  labels: string[];
  patterns?: RegExp[];
  required?: boolean;
};

type DocumentSpec = {
  label: string;
  hints: string[];
  fields: FieldSpec[];
};

const datePattern =
  String.raw`(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})`;

const documentSpecs: Record<OcrDocumentKind, DocumentSpec> = {
  ARAMCO_SUPPLIER: {
    label: "ARAMCO Supplier Approval",
    hints: ["ARAMCO approval letters"],
    fields: [
      field("aramcoReferenceNumber", "ARAMCO Reference Number", [
        "ARAMCO Reference Number",
        "Reference Number",
        "Ref No",
      ]),
      field("date", "Date", ["Date"], [new RegExp(datePattern)]),
      field("supplierName", "Supplier Name", ["Supplier Name", "Vendor Name"], [], true),
      field("supplierCrNumber", "Supplier CR Number", [
        "Supplier CR Number",
        "Commercial Registration",
        "CR Number",
      ]),
      field("supplierType", "Supplier Type", ["Supplier Type"]),
      field("country", "Country", ["Country"]),
      field("vendorCodeNumber", "Vendor Code Number", [
        "Vendor Code Number",
        "Vendor Code",
      ]),
      field("plantId", "Plant ID", ["Plant ID"]),
    ],
  },
  IQAMA: {
    label: "Iqama / Muqeem",
    hints: ["MOI/Jawazat iqama templates"],
    fields: [
      field("holderNameEnglish", "Iqama Holder Complete Name - English", [
        "Name",
        "Full Name",
        "Complete Name",
      ]),
      field("holderNameArabic", "Iqama Holder Complete Name - Arabic", [
        "الاسم",
        "الاسم الكامل",
      ]),
      field("iqamaNumber", "Iqama Number", ["Iqama Number", "ID Number"], [
        /\b[12]\d{9}\b/,
      ], true),
      field("expiryDate", "Expiry Date", ["Expiry Date", "Date of Expiry", "تاريخ الانتهاء"], [
        new RegExp(datePattern),
      ], true),
      field("placeOfIssue", "Place of Issue", ["Place of Issue", "Issue Place"]),
      field("issueDate", "Issue Date", ["Issue Date", "Date of Issue"]),
      field("dateOfBirth", "Date of Birth", ["Date of Birth", "DOB"]),
      field("renewNumber", "Renew Number", ["Renew Number", "Renewal Number"]),
      field("profession", "Profession", ["Profession", "Occupation"]),
      field("sponsorName", "Sponsor Name", ["Sponsor Name", "Sponsor"]),
    ],
  },
  SAUDI_ID: {
    label: "Saudi National ID",
    hints: ["Saudi ID front/back templates"],
    fields: [
      field("holderNameEnglish", "ID Holder Complete Name - English", [
        "Name",
        "Full Name",
      ]),
      field("holderNameArabic", "ID Holder Complete Name - Arabic", ["الاسم"]),
      field("idNumber", "ID Number", ["ID Number", "National ID"], [/\b[12]\d{9}\b/], true),
      field("dateOfBirth", "Date of Birth", ["Date of Birth", "DOB"]),
      field("expiryDate", "Date of Expiry", ["Date of Expiry", "Expiry Date"], [
        new RegExp(datePattern),
      ], true),
      field("placeOfBirth", "Place of Birth", ["Place of Birth"]),
    ],
  },
  GOSI_ESTABLISHMENT: {
    label: "GOSI Establishment Certificate",
    hints: ["GOSI corporate certificate"],
    fields: [
      field("dateGregorian", "Date - Gregorian", ["Date - Gregorian", "Gregorian"]),
      field("dateHijri", "Date - Hijri", ["Date - Hijri", "Hijri"]),
      field("certificateNumber", "Certificate Number", ["Certificate Number"], [], true),
      field("establishmentName", "Establishment Name", [
        "Establishment Name",
        "Company Name",
      ], [], true),
      field("subscriptionNumber", "Subscription Number", ["Subscription Number"]),
      field("unifiedNationalNumber", "Unified National Number", [
        "Unified National Number",
        "Unified No",
      ]),
      field("address", "Address", ["Address"]),
      field("saudiSubscribers", "Number of Saudi Subscribers", [
        "Saudi Subscribers",
      ]),
      field("nonSaudiSubscribers", "Number of Non-Saudi Subscribers", [
        "Non-Saudi Subscribers",
      ]),
      field("totalSubscribers", "Total", ["Total"]),
      field("expiryDateHijri", "Expiry Date - Hijri", ["Expiry Date - Hijri"]),
    ],
  },
  GOSI_EMPLOYEE: {
    label: "GOSI Employee Certificate",
    hints: ["GOSI salary or employee record"],
    fields: [
      field("employeeName", "Name", ["Name"], [], true),
      field("dateOfBirth", "Date of Birth", ["Date of Birth"]),
      field("nationalIdOrIqama", "National ID/IQAMA", ["National ID", "IQAMA"], [
        /\b[12]\d{9}\b/,
      ], true),
      field("nationality", "Nationality", ["Nationality"]),
      field("pensionsLaw", "Pensions Laws", ["Pensions Laws"]),
      field("socialInsuranceLaw", "Social Insurance Law", ["Social Insurance Law"]),
      field("totalPaidMonths", "Total Paid Months", ["Total Paid Months"]),
      field("totalMonths", "Total Months", ["Total Months"]),
      field("establishmentName", "Establishment Name", ["Establishment Name"]),
      field("registrationNumber", "Registration Number", ["Registration Number"]),
      field("joiningDate", "Joining Date", ["Joining Date"]),
      field("law", "The Law", ["The Law", "Law"]),
      field("startDateWage", "Start Date Wage", ["Start Date Wage"]),
      field("wages", "Wages", ["Wages"]),
      field("totalWage", "Total Wage", ["Total Wage"]),
      field("coverageType", "Coverage Type", ["Coverage Type"]),
    ],
  },
  ZATCA_CERTIFICATE: {
    label: "ZATCA Certificate",
    hints: ["Zakat, Tax and Customs Authority certificate"],
    fields: [
      field("companyName", "Company Name", ["Company Name", "Taxpayer Name"], [], true),
      field("entityUnifiedNumber", "Entity Unified No./ID No.", [
        "Entity Unified No",
        "ID No",
      ]),
      field("registrationNumber", "Commercial Registration/License/Contract No.", [
        "Commercial registration",
        "License",
        "Contract No",
        "CR/License/Contract No",
      ], [], true),
      field("expiryDateHijri", "Expiry Date - Hijri", ["Expiry Date - Hijri"]),
      field("expiryDateGregorian", "Expiry Date - Gregorian", [
        "Expiry Date - Gregorian",
        "Expiry Date",
      ], [new RegExp(datePattern)], true),
    ],
  },
  VAT_CERTIFICATE: {
    label: "VAT Registration Certificate",
    hints: ["VAT registration certificate"],
    fields: [
      field("issuanceDate", "Issuance Date", ["Issuance Date"], [
        new RegExp(datePattern),
      ]),
      field("uniqueNumber", "Unique Number", ["Unique Number"], [], true),
      field("vatRegistrationDate", "VAT Registration Date", ["VAT Registration date"]),
      field("taxpayerName", "Taxpayer Name", ["Taxpayer Name", "Company Name"], [], true),
      field("vatRegistrationNumber", "VAT Registration Number", [
        "VAT Registration Number",
        "Tax Registration Number",
      ], [], true),
      field("effectiveRegistrationDate", "Effective Registration Date", [
        "Effective Registration Date",
      ]),
      field("taxpayerAddress", "Taxpayer Address", ["Taxpayer Address", "Address"]),
      field("crLicenseContractNumber", "CR/License/Contract No.", [
        "CR/License/Contract No",
        "Commercial registration",
      ]),
      field("taxPeriod", "Tax Period", ["Tax Period"]),
      field("firstFilingDueDate", "First Filing Due Date", ["First Filing Due Date"]),
    ],
  },
  CHAMBER_CERTIFICATE: {
    label: "Chamber of Commerce Certificate",
    hints: ["Asharqia Chamber and Saudi Business Center certificates"],
    fields: [
      field("companyName", "Company Name", ["Company Name"], [], true),
      field("certificateDate", "Certificate Date", ["Certificate Date", "Date"]),
      field("membershipDate", "Date of Membership", ["Date of Membership"]),
      field("expiryDate", "Date of Expiry", ["Date of Expiry", "Expiry Date"], [
        new RegExp(datePattern),
      ], true),
      field("subscriptionStatus", "Subscription Status", ["Subscription Status", "Status"]),
    ],
  },
  COMMERCIAL_REGISTRATION: {
    label: "Commercial Registration",
    hints: ["MoC and Saudi Business Center CR certificates"],
    fields: [
      field("companyName", "Company Name", ["Company Name", "Trade Name"], [], true),
      field("unifiedNationalNumber", "Unified National Number", [
        "Unified National Number",
        "Unified No",
      ]),
      field("issueDate", "Date of Issuance", ["Date of Issuance", "Issue Date"]),
      field("companyType", "Company Type", ["Company Type", "Type"]),
      field("crNumber", "CR Number", ["CR Number", "Commercial Registration"], [
        /\b\d{10}\b/,
      ], true),
      field("expiryDate", "Expiry Date", ["Expiry Date", "Certificates Expiry Date"], [
        new RegExp(datePattern),
      ], true),
    ],
  },
  BRANCH_REGISTRATION: {
    label: "Branch Company Registration",
    hints: ["Branch registration certificate"],
    fields: [
      field("unifiedNumber", "Unified No", ["Unified No"], [], true),
      field("establishmentNumber", "Establishment No", ["Establishment No"]),
      field("dateHijri", "Date - Hijri", ["Date - Hijri", "Dated"]),
      field("companyName", "Company Name", ["Company Name"], [], true),
      field("type", "Type", ["Type"]),
      field("capital", "Capital", ["Capital"]),
      field("headQuarterAddress", "Head Quarter Address", ["Head Quarter Address"]),
      field("headQuarterCr", "CR of the HQ", ["CR of the HQ"]),
      field("source", "Source", ["Source"]),
      field("branchTradeName", "Branch's Trade Name", ["Branch's Trade Name"]),
      field("expiryDateHijri", "Certificates Expiry Date - Hijri", [
        "Certificates Expiry Date",
      ], [], true),
    ],
  },
  BALADIYAH_LICENSE: genericWith([
    field("licenseNumber", "License Number", ["License Number", "Balady License"]),
    field("municipality", "Municipality", ["Municipality"]),
    field("businessActivity", "Business Activity", ["Business Activity", "Activity"]),
    field("location", "Location", ["Location", "Address"]),
  ], "Baladiyah Commercial Activity License", ["Balady/MOMRA license"]),
  MOMRA_CLASSIFICATION: genericWith(
    [field("classificationNumber", "Classification Number", ["Classification Number"])],
    "MOMRA Classification Certificate",
    ["MOMRA classification"],
  ),
  NATIONAL_ADDRESS: genericWith(
    [field("address", "Address", ["Address", "National Address"])],
    "National Address Proof",
    ["National address proof"],
  ),
  LOCAL_CONTENT: genericWith(
    [field("certificateNumber", "Certificate Number", ["Certificate Number"])],
    "Local Content Certificate",
    ["Local content certificate"],
  ),
  SAUDI_COUNCIL_ENGINEERS: genericWith(
    [field("membershipNumber", "Membership Number", ["Membership Number"])],
    "Saudi Council of Engineers Certificate",
    ["Saudi Council of Engineers certificate"],
  ),
  INSURANCE: genericWith(
    [
      field("policyNumber", "Policy Number", ["Policy Number"], [], true),
      field("provider", "Provider", ["Provider", "Insurance Company"]),
      field("coverageDates", "Coverage Dates", ["Coverage Dates", "Period"]),
      field("insuredParty", "Insured Entity/Person", ["Insured", "Insured Party"]),
    ],
    "Insurance Policy",
    ["Insurance templates"],
  ),
  WORK_PERMIT: genericWith(
    [
      field("permitNumber", "Permit Number", ["Permit Number", "Work Permit"]),
      field("employeeName", "Employee Name", ["Employee Name", "Name"]),
      field("occupation", "Occupation", ["Occupation", "Profession"]),
      field("entity", "Entity", ["Entity", "Employer"]),
    ],
    "Labor / Work Permit",
    ["Qiwa and work permit documents"],
  ),
  GENERIC_ADMINISTRATIVE_ASSET: genericWith(
    [field("authority", "Authority", ["Authority", "Issued By"])],
    "Generic Administrative Asset",
    ["Fallback for other administrative assets"],
  ),
};

function field(
  key: string,
  label: string,
  labels: string[],
  patterns: RegExp[] = [],
  required = false,
): FieldSpec {
  return { key, label, labels, patterns, required };
}

function genericWith(
  extraFields: FieldSpec[],
  label: string,
  hints: string[],
): DocumentSpec {
  return {
    label,
    hints,
    fields: [
      field("title", "Title", ["Title", "Certificate"], [], true),
      field("name", "Name", ["Name", "Company Name", "Entity Name"], [], true),
      field("crNumber", "CR Number", ["CR Number", "Commercial Registration"], [
        /\b\d{10}\b/,
      ]),
      field("documentNumber", "Document Number", [
        "Document Number",
        "Certificate Number",
        "License Number",
      ]),
      field("issueDate", "Issue Date", ["Issue Date", "Issuance Date"], [
        new RegExp(datePattern),
      ]),
      field("expiryDate", "Expiry Date", ["Expiry Date", "Valid Until", "Date of Expiry"], [
        new RegExp(datePattern),
      ], true),
      ...extraFields,
    ],
  };
}

export function analyzeOcrText(input: {
  rawText: string;
  filename?: string;
  engine?: string;
  engineConfidence?: number;
  warnings?: string[];
}): OcrExtractionResult {
  const rawText = normalizeWhitespace(input.rawText);
  const documentKind = classifyOcrText(rawText, input.filename);
  const spec = documentSpecs[documentKind];
  const fields = extractFields(rawText, spec);
  const requiredFields = spec.fields.filter((item) => item.required);
  const foundRequired = requiredFields.filter((item) =>
    fields.some((fieldItem) => fieldItem.key === item.key),
  );
  const missingRequiredFields = requiredFields
    .filter((item) => !fields.some((fieldItem) => fieldItem.key === item.key))
    .map((item) => item.label);
  const extractionScore =
    requiredFields.length === 0
      ? fields.length > 0
        ? 0.75
        : 0.25
      : foundRequired.length / requiredFields.length;
  const engineConfidence = clamp(input.engineConfidence ?? 0.7);
  const overallConfidence = clamp(
    fields.length === 0 ? engineConfidence * 0.25 : engineConfidence * extractionScore,
  );

  return {
    engine: input.engine ?? "text-rule-extractor",
    languageHints: ["eng", "ara"],
    rawText,
    documentKind,
    documentTypeLabel: spec.label,
    overallConfidence,
    fields,
    missingRequiredFields,
    requiresReview:
      overallConfidence < 0.82 ||
      missingRequiredFields.length > 0 ||
      fields.some((item) => item.status === "LOW_CONFIDENCE"),
    warnings: [
      ...(input.warnings ?? []),
      ...(fields.length === 0
        ? ["No reliable fields were extracted. The document should be reviewed manually."]
        : []),
    ],
    templateHints: spec.hints,
  };
}

export function classifyOcrText(
  rawText: string,
  filename = "",
): OcrDocumentKind {
  const haystack = `${filename}\n${rawText}`.toLowerCase();

  if (matches(haystack, ["aramco", "vendor code", "supplier cr"])) {
    return "ARAMCO_SUPPLIER";
  }

  if (matches(haystack, ["vat registration", "taxpayer", "value added tax"])) {
    return "VAT_CERTIFICATE";
  }

  if (matches(haystack, ["zakat", "customs authority", "zatca"])) {
    return "ZATCA_CERTIFICATE";
  }

  if (matches(haystack, ["asharqia chamber", "chamber of commerce", "subscription status"])) {
    return "CHAMBER_CERTIFICATE";
  }

  if (matches(haystack, ["branch of company", "branch's trade name", "cr of the hq"])) {
    return "BRANCH_REGISTRATION";
  }

  if (matches(haystack, ["commercial registration", "ministry of commerce"])) {
    return "COMMERCIAL_REGISTRATION";
  }

  if (matches(haystack, ["gosi", "social insurance", "subscription number"])) {
    return matches(haystack, ["wage", "joining date", "coverage type"])
      ? "GOSI_EMPLOYEE"
      : "GOSI_ESTABLISHMENT";
  }

  if (matches(haystack, ["iqama", "muqeem", "sponsor name"])) {
    return "IQAMA";
  }

  if (matches(haystack, ["national id", "place of birth", "identity card"])) {
    return "SAUDI_ID";
  }

  if (matches(haystack, ["balady", "baladiyah", "municipality", "commercial activity"])) {
    return "BALADIYAH_LICENSE";
  }

  if (matches(haystack, ["momra", "classification certificate"])) {
    return "MOMRA_CLASSIFICATION";
  }

  if (matches(haystack, ["national address", "building number", "additional number"])) {
    return "NATIONAL_ADDRESS";
  }

  if (matches(haystack, ["local content"])) {
    return "LOCAL_CONTENT";
  }

  if (matches(haystack, ["saudi council of engineers", "engineering accreditation"])) {
    return "SAUDI_COUNCIL_ENGINEERS";
  }

  if (matches(haystack, ["insurance", "policy number", "insured"])) {
    return "INSURANCE";
  }

  if (matches(haystack, ["work permit", "labor", "qiwa", "occupation"])) {
    return "WORK_PERMIT";
  }

  return "GENERIC_ADMINISTRATIVE_ASSET";
}

function extractFields(text: string, spec: DocumentSpec) {
  const fields = new Map<string, OcrField>();

  for (const item of spec.fields) {
    const labelValue = findLabelValue(text, item.labels);
    const patternValue =
      labelValue ?? item.patterns?.map((pattern) => firstMatch(text, pattern)).find(Boolean);
    const genericValue = patternValue ?? inferGenericValue(text, item.key);

    if (!genericValue) {
      continue;
    }

    const value = cleanValue(genericValue);
    if (!value || value.length < 2) {
      continue;
    }

    const source: OcrField["source"] = labelValue
      ? "label"
      : patternValue
        ? "pattern"
        : "generic";
    const confidence =
      source === "label" ? 0.9 : source === "pattern" ? 0.74 : 0.56;

    fields.set(item.key, {
      key: item.key,
      label: item.label,
      value,
      confidence,
      status: confidence < 0.78 ? "LOW_CONFIDENCE" : "READY",
      source,
    });
  }

  return Array.from(fields.values());
}

function findLabelValue(text: string, labels: string[]) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const label of labels) {
    const escaped = escapeRegex(label);
    const sameLine = new RegExp(`${escaped}\\s*[:\\-]?\\s*(.+)$`, "i");

    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      if (!line) {
        continue;
      }

      const match = line.match(sameLine);
      if (match?.[1] && !isMostlyLabel(match[1], labels)) {
        return match[1];
      }

      if (line.toLowerCase().includes(label.toLowerCase())) {
        const next = lines[index + 1];
        if (next && !isMostlyLabel(next, labels)) {
          return next;
        }
      }
    }
  }

  return undefined;
}

function inferGenericValue(text: string, key: string) {
  if (key.toLowerCase().includes("date")) {
    return firstMatch(text, new RegExp(datePattern));
  }

  if (key.toLowerCase().includes("cr") || key.toLowerCase().includes("number")) {
    return firstMatch(text, /\b\d{6,15}\b/);
  }

  if (key === "title") {
    return text.split(/\r?\n/).find((line) => line.trim().length > 8);
  }

  return undefined;
}

function matches(value: string, tokens: string[]) {
  return tokens.some((token) => value.includes(token));
}

function firstMatch(value: string, pattern: RegExp) {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const matcher = new RegExp(pattern.source, flags);
  const match = matcher.exec(value);
  return match?.[1] ?? match?.[0];
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanValue(value: string) {
  return value
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:|.-]+/, "")
    .replace(/[\s|]+$/, "")
    .trim();
}

function isMostlyLabel(value: string, labels: string[]) {
  const normalized = value.trim().toLowerCase();
  return labels.some((label) => normalized === label.toLowerCase());
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}
