import { createServiceClient } from "./client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function seed() {
  const supabase = createServiceClient(supabaseUrl, serviceRoleKey);

  console.log("Seeding jurisdictions...");

  const jurisdictions = [
    {
      name: "United States Federal",
      level: "federal" as const,
      state: null,
      county: null,
      city: null,
      website: "https://www.sba.gov/business-guide/launch-your-business/apply-licenses-permits",
    },
    {
      name: "State of Nevada",
      level: "state" as const,
      state: "NV",
      county: null,
      city: null,
      website: "https://www.nvsos.gov/sos/businesses",
    },
    {
      name: "Clark County",
      level: "county" as const,
      state: "NV",
      county: "Clark",
      city: null,
      website: "https://www.clarkcountynv.gov/government/departments/business_license/index.php",
    },
    {
      name: "City of Las Vegas",
      level: "city" as const,
      state: "NV",
      county: "Clark",
      city: "Las Vegas",
      website: "https://www.lasvegasnevada.gov/Business",
    },
    {
      name: "State of California",
      level: "state" as const,
      state: "CA",
      county: null,
      city: null,
      website: "https://www.sos.ca.gov/business-programs",
    },
  ];

  const { error: jurisdictionError } = await supabase
    .from("jurisdictions")
    .upsert(jurisdictions, { onConflict: "level,state,county,city" });

  if (jurisdictionError) {
    console.error("Error seeding jurisdictions:", jurisdictionError);
    process.exit(1);
  }

  console.log(`Seeded ${jurisdictions.length} jurisdictions.`);
  console.log("Seed completed successfully.");
}

seed().catch(console.error);
