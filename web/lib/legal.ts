const legalEnvironmentKeys = [
  "LEGAL_OPERATOR_NAME",
  "LEGAL_OPERATOR_STREET",
  "LEGAL_OPERATOR_POSTAL_CODE",
  "LEGAL_OPERATOR_CITY",
  "LEGAL_CONTACT_EMAIL",
  "LEGAL_HOSTING_PROVIDER_NAME",
  "LEGAL_HOSTING_PROCESSING_LOCATIONS",
  "LEGAL_HOSTING_RETENTION_INFORMATION",
  "LEGAL_HOSTING_THIRD_COUNTRY_INFORMATION",
  "LEGAL_EMAIL_PROVIDER_NAME",
  "LEGAL_EMAIL_PROCESSING_LOCATIONS",
  "LEGAL_EMAIL_THIRD_COUNTRY_INFORMATION",
] as const;

type LegalEnvironmentKey = (typeof legalEnvironmentKeys)[number];

export type LegalEnvironment = Partial<Record<LegalEnvironmentKey, string>>;

type LegalRuntime = typeof globalThis & {
  __roetgesportalLegalEnvironment?: LegalEnvironment;
};

const placeholderPattern =
  /<[^>]+>|\[[^\]]+\]|\b(?:todo|tbd|tba|noch angeben|im aufbau|wird noch ergänzt|changeme|replace me|placeholder)\b/i;

export function setLegalEnvironment(environment?: LegalEnvironment) {
  const selectedEnvironment = Object.fromEntries(
    legalEnvironmentKeys.map((key) => [key, environment?.[key]]),
  ) as LegalEnvironment;

  (globalThis as LegalRuntime).__roetgesportalLegalEnvironment =
    selectedEnvironment;
}

function requiredValue(key: LegalEnvironmentKey) {
  const runtimeEnvironment = (globalThis as LegalRuntime)
    .__roetgesportalLegalEnvironment;
  const value = (runtimeEnvironment?.[key] ?? process.env[key])?.trim();

  if (!value || placeholderPattern.test(value)) {
    throw new Error(`Required legal configuration ${key} is missing`);
  }

  return value;
}

export function getLegalConfig() {
  const postalCode = requiredValue("LEGAL_OPERATOR_POSTAL_CODE");
  const email = requiredValue("LEGAL_CONTACT_EMAIL");

  if (!/^\d{5}$/.test(postalCode)) {
    throw new Error("LEGAL_OPERATOR_POSTAL_CODE must contain five digits");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("LEGAL_CONTACT_EMAIL must be a valid email address");
  }

  return {
    operator: {
      name: requiredValue("LEGAL_OPERATOR_NAME"),
      street: requiredValue("LEGAL_OPERATOR_STREET"),
      postalCode,
      city: requiredValue("LEGAL_OPERATOR_CITY"),
      country: "Deutschland",
      email,
    },
    hosting: {
      providerName: requiredValue("LEGAL_HOSTING_PROVIDER_NAME"),
      processingLocations: requiredValue(
        "LEGAL_HOSTING_PROCESSING_LOCATIONS",
      ),
      retentionInformation: requiredValue(
        "LEGAL_HOSTING_RETENTION_INFORMATION",
      ),
      thirdCountryInformation: requiredValue(
        "LEGAL_HOSTING_THIRD_COUNTRY_INFORMATION",
      ),
    },
    email: {
      providerName: requiredValue("LEGAL_EMAIL_PROVIDER_NAME"),
      processingLocations: requiredValue(
        "LEGAL_EMAIL_PROCESSING_LOCATIONS",
      ),
      thirdCountryInformation: requiredValue(
        "LEGAL_EMAIL_THIRD_COUNTRY_INFORMATION",
      ),
    },
  };
}

export function assertLegalConfig() {
  getLegalConfig();
}
