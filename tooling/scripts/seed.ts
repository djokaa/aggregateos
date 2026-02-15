/**
 * Database seed script for AggregateOS
 *
 * Populates the database with realistic aggregate logistics industry data
 * for development and demo purposes.
 *
 * Usage:
 *   npx tsx tooling/scripts/seed.ts
 *   # or from the db package:
 *   pnpm db:seed
 */
import "dotenv/config";

import { createDb } from "@aggregateos/db";
import {
  organizations,
  users,
  customers,
  customerContacts,
  locations,
  materials,
  rateCards,
  estimates,
  estimateLineItems,
  estimateHistoryEvents,
  estimateComments,
  estimateAttachments,
  estimateVersions,
  estimateRecipients,
  estimateAccessTokens,
  orders,
  projects,
  drivers,
  vehicles,
  dispatches,
  loads,
  tickets,
  invoices,
  invoiceLineItems,
} from "@aggregateos/db";

// ---------------------------------------------------------------------------
// Database connection
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("ERROR: DATABASE_URL environment variable is required.");
  process.exit(1);
}

const db = createDb(DATABASE_URL);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(message: string) {
  console.log(`[seed] ${message}`);
}

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function seed() {
  log("Starting database seed...");

  // =========================================================================
  // 1. Clear existing data (reverse FK order)
  // =========================================================================
  log("Clearing existing data...");

  await db.delete(invoiceLineItems);
  await db.delete(invoices);
  await db.delete(tickets);
  await db.delete(loads);
  await db.delete(dispatches);
  await db.delete(orders);
  await db.delete(estimateAccessTokens);
  await db.delete(estimateRecipients);
  await db.delete(estimateVersions);
  await db.delete(estimateAttachments);
  await db.delete(estimateComments);
  await db.delete(estimateHistoryEvents);
  await db.delete(estimateLineItems);
  await db.delete(estimates);
  await db.delete(rateCards);
  await db.delete(drivers);
  await db.delete(vehicles);
  await db.delete(materials);
  await db.delete(locations);
  await db.delete(projects);
  await db.delete(customerContacts);
  await db.delete(customers);
  await db.delete(users);
  await db.delete(organizations);

  log("All tables cleared.");

  // =========================================================================
  // 2. Organizations
  // =========================================================================
  log("Inserting organizations...");

  // Deterministic UUIDs so dev fallback in trpc route & trpc-server.ts always
  // matches. If you change these, update apps/web/src/app/api/trpc/[trpc]/route.ts
  // and apps/web/src/lib/trpc-server.ts accordingly.
  const SEED_ORG_ID = "4d7d6b40-6fac-4b5d-95a1-5047ad5053cb";
  const SEED_ADMIN_USER_ID = "c9590da3-8d7c-4022-b2da-14a42bdd9708";
  const SEED_DISPATCHER_USER_ID = "2a61f77f-01fa-4cfb-aa42-d802468b9559";

  const [org] = await db
    .insert(organizations)
    .values([
      {
        id: SEED_ORG_ID,
        name: "Ryland Logistics",
        slug: "ryland",
        type: "ryland",
      },
    ])
    .returning();

  const orgId = org!.id;

  // =========================================================================
  // 3. Users
  // =========================================================================
  log("Inserting users...");

  const insertedUsers = await db
    .insert(users)
    .values([
      {
        id: SEED_ADMIN_USER_ID,
        email: "admin@ryland.com",
        name: "Admin User",
        role: "platform_admin",
        organizationId: orgId,
      },
      {
        id: SEED_DISPATCHER_USER_ID,
        email: "dispatch@ryland.com",
        name: "Sarah Mitchell",
        role: "dispatcher",
        organizationId: orgId,
      },
    ])
    .returning();

  const adminUser = insertedUsers[0]!;
  const dispatcherUser = insertedUsers[1]!;

  // =========================================================================
  // 4. Customers
  // =========================================================================
  log("Inserting customers...");

  const insertedCustomers = await db
    .insert(customers)
    .values([
      {
        entityId: orgId,
        name: "Smith Construction Co.",
        legalName: "Smith Construction Co., Inc.",
        contactName: "John Smith",
        contactPhone: "770-555-0101",
        contactEmail: "john@smithconstruction.com",
        billingAddress: "123 Industrial Blvd",
        billingCity: "Atlanta",
        billingState: "GA",
        billingZip: "30301",
        creditTerms: "net_30",
        creditLimit: "150000.00",
      },
      {
        entityId: orgId,
        name: "Lennar Homes Southeast",
        legalName: "Lennar Corporation — SE Division",
        contactName: "Maria Garcia",
        contactPhone: "770-555-0102",
        contactEmail: "mgarcia@lennar.com",
        billingAddress: "456 Builder Pkwy",
        billingCity: "Atlanta",
        billingState: "GA",
        billingZip: "30309",
        creditTerms: "net_45",
        creditLimit: "500000.00",
      },
      {
        entityId: orgId,
        name: "DOT Highway Division",
        legalName: "Georgia Department of Transportation",
        contactName: "Robert Williams",
        contactPhone: "404-555-0103",
        contactEmail: "rwilliams@dot.ga.gov",
        billingAddress: "600 West Peachtree St NW",
        billingCity: "Atlanta",
        billingState: "GA",
        billingZip: "30308",
        creditTerms: "net_60",
        notes: "Government contractor — requires W-9 on file",
      },
      {
        entityId: orgId,
        name: "Metro Development Corp",
        contactName: "James Wilson",
        contactPhone: "678-555-0104",
        contactEmail: "jwilson@metrodev.com",
        billingAddress: "789 Commerce Dr",
        billingCity: "Marietta",
        billingState: "GA",
        billingZip: "30060",
        creditTerms: "net_30",
        creditLimit: "200000.00",
      },
      {
        entityId: orgId,
        name: "Southeastern Contractors LLC",
        legalName: "Southeastern Contractors LLC",
        contactName: "David Brown",
        contactPhone: "770-555-0105",
        contactEmail: "dbrown@secontractors.com",
        billingAddress: "321 Peachtree Industrial Blvd",
        billingCity: "Duluth",
        billingState: "GA",
        billingZip: "30096",
        creditTerms: "net_30",
        creditLimit: "100000.00",
      },
      {
        entityId: orgId,
        name: "Heritage Builders Group",
        contactName: "Lisa Anderson",
        contactPhone: "470-555-0106",
        contactEmail: "landerson@heritagebuilders.com",
        billingAddress: "55 Roswell Rd",
        billingCity: "Roswell",
        billingState: "GA",
        billingZip: "30075",
        creditTerms: "net_15",
      },
      {
        entityId: orgId,
        name: "Pinnacle Infrastructure",
        contactName: "Michael Taylor",
        contactPhone: "678-555-0107",
        contactEmail: "mtaylor@pinnacleinfra.com",
        billingAddress: "1200 Cobb Pkwy",
        billingCity: "Kennesaw",
        billingState: "GA",
        billingZip: "30144",
        creditTerms: "net_45",
        creditLimit: "300000.00",
      },
      {
        entityId: orgId,
        name: "Coastal Concrete & Paving",
        contactName: "Jennifer Martinez",
        contactPhone: "912-555-0108",
        contactEmail: "jmartinez@coastalconcrete.com",
        billingAddress: "900 Savannah Hwy",
        billingCity: "Savannah",
        billingState: "GA",
        billingZip: "31401",
        creditTerms: "cod",
      },
    ])
    .returning();

  const smithConstruction = insertedCustomers[0]!;
  const lennarHomes = insertedCustomers[1]!;
  const dotHighway = insertedCustomers[2]!;

  // =========================================================================
  // 4b. Customer Contacts
  // =========================================================================
  log("Inserting customer contacts...");

  await db.insert(customerContacts).values([
    // Smith Construction
    {
      customerId: smithConstruction.id,
      name: "John Smith",
      email: "john@smithconstruction.com",
      phone: "770-555-0101",
      role: "executive",
      isPrimary: true,
    },
    {
      customerId: smithConstruction.id,
      name: "Karen Smith",
      email: "karen@smithconstruction.com",
      phone: "770-555-0111",
      role: "ap",
    },
    // Lennar Homes
    {
      customerId: lennarHomes.id,
      name: "Maria Garcia",
      email: "mgarcia@lennar.com",
      phone: "770-555-0102",
      role: "pm",
      isPrimary: true,
    },
    {
      customerId: lennarHomes.id,
      name: "Tom Rivera",
      email: "trivera@lennar.com",
      phone: "770-555-0112",
      role: "dispatch",
    },
    // DOT
    {
      customerId: dotHighway.id,
      name: "Robert Williams",
      email: "rwilliams@dot.ga.gov",
      phone: "404-555-0103",
      role: "pm",
      isPrimary: true,
    },
    {
      customerId: dotHighway.id,
      name: "Sandra Lee",
      email: "slee@dot.ga.gov",
      phone: "404-555-0113",
      role: "ap",
    },
  ]);

  // =========================================================================
  // 5. Locations
  // =========================================================================
  log("Inserting locations...");

  const insertedLocations = await db
    .insert(locations)
    .values([
      // --- Quarries ---
      {
        entityId: orgId,
        type: "quarry",
        name: "Eagle Rock Quarry",
        address: "4521 Quarry Rd",
        city: "Kennesaw",
        state: "GA",
        zip: "30144",
        lat: 33.9519,
        lng: -84.5451,
        operatingHoursStart: "06:00",
        operatingHoursEnd: "17:00",
        contactName: "Tom Harris",
        contactPhone: "770-555-0301",
        region: "Metro Atlanta",
        market: "GA",
        scaleInfo: "CAT scale on exit — all trucks must weigh out",
      },
      {
        entityId: orgId,
        type: "quarry",
        name: "Piedmont Sand & Gravel",
        address: "890 Pit Rd",
        city: "Cumming",
        state: "GA",
        zip: "30028",
        lat: 34.0851,
        lng: -84.231,
        operatingHoursStart: "06:00",
        operatingHoursEnd: "16:30",
        contactName: "Doug Farmer",
        contactPhone: "678-555-0302",
        region: "North Georgia",
        market: "GA",
      },
      {
        entityId: orgId,
        type: "quarry",
        name: "Blue Ridge Materials",
        address: "1560 Mountain Pass Rd",
        city: "Dawsonville",
        state: "GA",
        zip: "30534",
        lat: 34.248,
        lng: -84.1526,
        operatingHoursStart: "07:00",
        operatingHoursEnd: "16:00",
        contactName: "Randy Craig",
        contactPhone: "706-555-0303",
        region: "North Georgia",
        market: "GA",
      },
      // --- Job Sites ---
      {
        entityId: orgId,
        type: "job_site",
        name: "I-85 Bridge Expansion",
        address: "I-85 at Exit 88",
        city: "Atlanta",
        state: "GA",
        zip: "30310",
        lat: 33.849,
        lng: -84.388,
        contactName: "Robert Williams",
        contactPhone: "404-555-0103",
        notes: "DOT project — check in with flaggers on arrival",
        region: "Metro Atlanta",
        market: "GA",
        gateInfo: "Enter from northbound service road — flag station at mile marker 88.2",
      },
      {
        entityId: orgId,
        type: "job_site",
        name: "Oakwood Subdivision Phase 3",
        address: "Lot 100, Oakwood Dr",
        city: "Buford",
        state: "GA",
        zip: "30518",
        lat: 34.0065,
        lng: -83.966,
        contactName: "Maria Garcia",
        contactPhone: "770-555-0102",
        region: "North Georgia",
        market: "GA",
      },
      {
        entityId: orgId,
        type: "job_site",
        name: "Metro Water Treatment Plant",
        address: "2500 Bolton Rd NW",
        city: "Atlanta",
        state: "GA",
        zip: "30318",
        lat: 33.77,
        lng: -84.39,
        contactName: "James Wilson",
        contactPhone: "678-555-0104",
        notes: "Restricted access — must have badge",
        region: "Metro Atlanta",
        market: "GA",
        gateInfo: "Gate code #4455 — sign in at guard shack",
      },
      // --- Plants ---
      {
        entityId: orgId,
        type: "plant",
        name: "Central Concrete Batch Plant",
        address: "780 Plant Rd",
        city: "Marietta",
        state: "GA",
        zip: "30060",
        lat: 33.89,
        lng: -84.45,
        operatingHoursStart: "05:00",
        operatingHoursEnd: "18:00",
        contactName: "Frank Torres",
        contactPhone: "770-555-0304",
        region: "Metro Atlanta",
        market: "GA",
        scaleInfo: "Batch plant scale — ticket printed at dispatch window",
      },
      // --- Yards ---
      {
        entityId: orgId,
        type: "yard",
        name: "South Staging Yard",
        address: "400 Airport Blvd",
        city: "College Park",
        state: "GA",
        zip: "30337",
        lat: 33.68,
        lng: -84.41,
        contactName: "Kevin Brooks",
        contactPhone: "404-555-0305",
        region: "Metro Atlanta",
        market: "GA",
      },
    ])
    .returning();

  // Convenience aliases
  const eagleRock = insertedLocations[0]!; // quarry
  const piedmont = insertedLocations[1]!; // quarry
  const blueRidge = insertedLocations[2]!; // quarry
  const i85Bridge = insertedLocations[3]!; // job_site
  const oakwood = insertedLocations[4]!; // job_site
  const waterTreatment = insertedLocations[5]!; // job_site
  const centralPlant = insertedLocations[6]!; // plant
  const southYard = insertedLocations[7]!; // yard

  // =========================================================================
  // 6. Materials
  // =========================================================================
  log("Inserting materials...");

  const insertedMaterials = await db
    .insert(materials)
    .values([
      {
        entityId: orgId,
        name: "#57 Limestone",
        type: "rock",
        unit: "ton",
        description: "Standard #57 crushed limestone aggregate",
        category: "aggregate",
      },
      {
        entityId: orgId,
        name: "Concrete Sand",
        type: "sand",
        unit: "ton",
        description: "ASTM C33 fine aggregate for concrete mix",
        category: "aggregate",
      },
      {
        entityId: orgId,
        name: "Red Clay Fill",
        type: "fill",
        unit: "cy",
        description: "Native red clay fill dirt for grading",
        category: "fill",
      },
      {
        entityId: orgId,
        name: "Class A Gravel",
        type: "gravel",
        unit: "ton",
        description: "DOT-spec Class A base gravel",
        category: "aggregate",
      },
      {
        entityId: orgId,
        name: "Hot Mix Asphalt",
        type: "asphalt",
        unit: "ton",
        description: "Standard hot mix surface course",
        category: "hot_mix",
        linedBedRequired: true,
        tempSensitive: true,
      },
      {
        entityId: orgId,
        name: '3/4" Clear Stone',
        type: "rock",
        unit: "ton",
        description: "Washed 3/4-inch clear stone for drainage",
        category: "aggregate",
      },
      {
        entityId: orgId,
        name: "Rip Rap",
        type: "rock",
        unit: "ton",
        description: "Heavy erosion control stone (6–12 in.)",
        category: "aggregate",
      },
      {
        entityId: orgId,
        name: "Crusher Run",
        type: "gravel",
        unit: "ton",
        description: "Crushed stone with fines for compaction",
        category: "aggregate",
      },
    ])
    .returning();

  const limestone = insertedMaterials[0]!;
  const concreteSand = insertedMaterials[1]!;
  const redClayFill = insertedMaterials[2]!;
  const classAGravel = insertedMaterials[3]!;
  const hotMixAsphalt = insertedMaterials[4]!;
  const clearStone = insertedMaterials[5]!;
  const ripRap = insertedMaterials[6]!;
  const crusherRun = insertedMaterials[7]!;

  // =========================================================================
  // 7. Rate Cards (with market, rateType, driverPayRate, materialCostRate)
  // =========================================================================
  log("Inserting rate cards...");

  const insertedRateCards = await db
    .insert(rateCards)
    .values([
      {
        entityId: orgId,
        materialId: limestone.id,
        originId: eagleRock.id,
        destinationZone: "Metro Atlanta",
        market: "GA",
        rateType: "route_based",
        haulRate: "12.50",
        materialRate: "18.75",
        driverPayRate: "8.50",
        materialCostRate: "10.00",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: concreteSand.id,
        originId: piedmont.id,
        destinationZone: "Metro Atlanta",
        market: "GA",
        rateType: "route_based",
        haulRate: "14.00",
        materialRate: "22.00",
        driverPayRate: "9.50",
        materialCostRate: "12.00",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: classAGravel.id,
        originId: blueRidge.id,
        destinationZone: "North Georgia",
        market: "GA",
        rateType: "route_based",
        haulRate: "16.50",
        materialRate: "24.50",
        driverPayRate: "11.00",
        materialCostRate: "14.00",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: hotMixAsphalt.id,
        originId: centralPlant.id,
        destinationZone: "Metro Atlanta",
        market: "GA",
        rateType: "route_based",
        haulRate: "18.00",
        materialRate: "42.00",
        driverPayRate: "12.00",
        materialCostRate: "28.00",
        fuelSurchargePercent: "0.1500",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: redClayFill.id,
        originId: eagleRock.id,
        destinationZone: "Metro Atlanta",
        market: "GA",
        rateType: "route_based",
        haulRate: "10.00",
        materialRate: "8.50",
        driverPayRate: "7.00",
        materialCostRate: "4.50",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: clearStone.id,
        originId: piedmont.id,
        destinationZone: "Metro Atlanta",
        market: "GA",
        rateType: "route_based",
        haulRate: "13.50",
        materialRate: "20.00",
        driverPayRate: "9.00",
        materialCostRate: "11.00",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: ripRap.id,
        originId: blueRidge.id,
        destinationZone: "North Georgia",
        market: "GA",
        rateType: "route_based",
        haulRate: "17.00",
        materialRate: "28.00",
        driverPayRate: "11.50",
        materialCostRate: "16.00",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: crusherRun.id,
        originId: eagleRock.id,
        destinationZone: "Metro Atlanta",
        market: "GA",
        rateType: "route_based",
        haulRate: "11.50",
        materialRate: "16.00",
        driverPayRate: "8.00",
        materialCostRate: "9.00",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: limestone.id,
        originId: blueRidge.id,
        destinationZone: "Metro Atlanta",
        market: "GA",
        rateType: "route_based",
        haulRate: "18.00",
        materialRate: "18.75",
        driverPayRate: "12.00",
        materialCostRate: "10.00",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
        notes: "Longer haul from Blue Ridge",
      },
      {
        entityId: orgId,
        materialId: concreteSand.id,
        originId: eagleRock.id,
        destinationZone: "Metro Atlanta",
        market: "GA",
        rateType: "route_based",
        haulRate: "12.50",
        materialRate: "21.00",
        driverPayRate: "8.50",
        materialCostRate: "12.00",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: classAGravel.id,
        originId: eagleRock.id,
        destinationZone: "Metro Atlanta",
        market: "GA",
        rateType: "route_based",
        haulRate: "12.50",
        materialRate: "23.00",
        driverPayRate: "8.50",
        materialCostRate: "13.00",
        fuelSurchargePercent: "0.1200",
        effectiveDate: "2026-01-01",
      },
      {
        entityId: orgId,
        materialId: hotMixAsphalt.id,
        originId: centralPlant.id,
        destinationZone: "Outer Metro",
        market: "GA",
        rateType: "route_based",
        haulRate: "22.00",
        materialRate: "45.00",
        driverPayRate: "15.00",
        materialCostRate: "28.00",
        fuelSurchargePercent: "0.1500",
        effectiveDate: "2026-01-01",
        notes: "Premium rate for outer metro deliveries",
      },
    ])
    .returning();

  // =========================================================================
  // 8. Vehicles (with capability flags)
  // =========================================================================
  log("Inserting vehicles...");

  const insertedVehicles = await db
    .insert(vehicles)
    .values([
      {
        entityId: orgId,
        type: "dump_truck",
        make: "Kenworth",
        model: "T880",
        year: 2022,
        licensePlate: "GA-4821-TX",
        capacity: "22",
        maxCapacityTons: "22",
        asphaltOk: true,
        concreteOk: false,
        endDump: true,
        bellyDump: false,
        flatbed: false,
      },
      {
        entityId: orgId,
        type: "dump_truck",
        make: "Peterbilt",
        model: "567",
        year: 2023,
        licensePlate: "GA-7193-PB",
        capacity: "20",
        maxCapacityTons: "20",
        asphaltOk: false,
        concreteOk: true,
        endDump: true,
        bellyDump: false,
        flatbed: false,
      },
      {
        entityId: orgId,
        type: "dump_truck",
        make: "Mack",
        model: "Granite GR64",
        year: 2021,
        licensePlate: "GA-3356-MK",
        capacity: "24",
        maxCapacityTons: "24",
        asphaltOk: true,
        concreteOk: true,
        endDump: true,
        bellyDump: true,
        flatbed: false,
      },
      {
        entityId: orgId,
        type: "dump_truck",
        make: "Freightliner",
        model: "122SD",
        year: 2020,
        licensePlate: "GA-9012-FL",
        capacity: "21",
        maxCapacityTons: "21",
        asphaltOk: false,
        concreteOk: false,
        endDump: true,
        bellyDump: false,
        flatbed: false,
      },
    ])
    .returning();

  const kenworthTruck = insertedVehicles[0]!;
  const peterbiltTruck = insertedVehicles[1]!;
  const mackTruck = insertedVehicles[2]!;
  const freightlinerTruck = insertedVehicles[3]!;

  // =========================================================================
  // 9. Drivers (with regions, paymentMethod, payRateDefault)
  // =========================================================================
  log("Inserting drivers...");

  const insertedDrivers = await db
    .insert(drivers)
    .values([
      {
        entityId: orgId,
        name: "Mike Johnson",
        phone: "770-555-0201",
        email: "mjohnson@ryland.com",
        licenseNumber: "GA-DL-884721",
        vehicleId: kenworthTruck.id,
        status: "available",
        regions: ["Metro Atlanta", "North Georgia"],
        paymentMethod: "direct_deposit",
        payRateDefault: "8.50",
        onTimeRate: "0.9600",
        reliabilityScore: "0.9400",
        totalLoads: 247,
      },
      {
        entityId: orgId,
        name: "Carlos Rivera",
        phone: "770-555-0202",
        email: "crivera@ryland.com",
        licenseNumber: "GA-DL-553109",
        vehicleId: peterbiltTruck.id,
        status: "on_load",
        regions: ["Metro Atlanta"],
        paymentMethod: "direct_deposit",
        payRateDefault: "9.50",
        onTimeRate: "0.9200",
        reliabilityScore: "0.9000",
        totalLoads: 189,
      },
      {
        entityId: orgId,
        name: "Tommy Williams",
        phone: "770-555-0203",
        email: "twilliams@ryland.com",
        licenseNumber: "GA-DL-229834",
        vehicleId: mackTruck.id,
        status: "available",
        regions: ["Metro Atlanta", "North Georgia"],
        paymentMethod: "direct_deposit",
        payRateDefault: "10.00",
        onTimeRate: "0.9800",
        reliabilityScore: "0.9700",
        totalLoads: 312,
      },
      {
        entityId: orgId,
        name: 'James "Big Jim" Patterson',
        phone: "678-555-0204",
        email: "jpatterson@ryland.com",
        licenseNumber: "GA-DL-661547",
        vehicleId: freightlinerTruck.id,
        status: "offline",
        regions: ["Metro Atlanta"],
        paymentMethod: "check",
        payRateDefault: "8.00",
        onTimeRate: "0.8800",
        reliabilityScore: "0.8500",
        totalLoads: 156,
      },
      {
        entityId: orgId,
        name: "Derek Washington",
        phone: "404-555-0205",
        email: "dwashington@ryland.com",
        licenseNumber: "GA-DL-778823",
        status: "available",
        regions: ["Metro Atlanta", "South GA"],
        paymentMethod: "direct_deposit",
        payRateDefault: "9.00",
        onTimeRate: "0.9500",
        reliabilityScore: "0.9300",
        totalLoads: 278,
      },
      {
        entityId: orgId,
        name: "Bobby Chen",
        phone: "470-555-0206",
        email: "bchen@ryland.com",
        licenseNumber: "GA-DL-445566",
        status: "on_load",
        regions: ["Metro Atlanta"],
        paymentMethod: "direct_deposit",
        payRateDefault: "8.50",
        onTimeRate: "0.9100",
        reliabilityScore: "0.8900",
        totalLoads: 203,
      },
    ])
    .returning();

  const driverMike = insertedDrivers[0]!;
  const driverCarlos = insertedDrivers[1]!;
  const driverTommy = insertedDrivers[2]!;
  const _driverBigJim = insertedDrivers[3]!;
  const driverDerek = insertedDrivers[4]!;
  const driverBobby = insertedDrivers[5]!;

  // =========================================================================
  // 10. Estimates
  // =========================================================================
  log("Inserting estimates...");

  const est1Subtotal = "13392.86";
  const est1Fuel = "1607.14";
  const est1Total = "15000.00";

  const [est1] = await db
    .insert(estimates)
    .values([
      {
        entityId: orgId,
        customerId: smithConstruction.id,
        estimateNumber: "EST-000001",
        status: "draft",
        subtotal: est1Subtotal,
        fuelSurchargeTotal: est1Fuel,
        total: est1Total,
        validUntil: "2026-03-15",
        createdBy: dispatcherUser.id,
        notes: "Subdivision grading project — materials for initial phase",
        notesInternal: "Subdivision grading project — materials for initial phase. Need to check quarry availability before sending.",
        notesCustomer: "Materials for initial phase of Oakwood Subdivision grading. Pricing valid for 30 days.",
        market: "TN",
        sourceSystem: "aggregateos",
      },
    ])
    .returning();

  await db.insert(estimateLineItems).values([
    {
      estimateId: est1!.id,
      materialId: limestone.id,
      originId: eagleRock.id,
      destinationId: oakwood.id,
      quantity: "200",
      materialRate: "18.75",
      haulRate: "12.50",
      fuelSurcharge: "750.00",
      lineTotal: "7000.00",
      distanceMiles: "22.4",
      estimatedDurationMinutes: 45,
    },
    {
      estimateId: est1!.id,
      materialId: concreteSand.id,
      originId: piedmont.id,
      destinationId: oakwood.id,
      quantity: "200",
      materialRate: "22.00",
      haulRate: "14.00",
      fuelSurcharge: "864.00",
      lineTotal: "8000.00",
      distanceMiles: "18.6",
      estimatedDurationMinutes: 38,
    },
  ]);

  const est2Subtotal = "7589.29";
  const est2Fuel = "910.71";
  const est2Total = "8500.00";

  const [est2] = await db
    .insert(estimates)
    .values([
      {
        entityId: orgId,
        customerId: lennarHomes.id,
        estimateNumber: "EST-000002",
        status: "sent",
        subtotal: est2Subtotal,
        fuelSurchargeTotal: est2Fuel,
        total: est2Total,
        validUntil: "2026-03-01",
        sentAt: new Date("2026-02-05T10:00:00Z"),
        sentByUserId: dispatcherUser.id,
        createdBy: dispatcherUser.id,
        notes: "Driveway base for new home lots",
        notesInternal: "Driveway base for Lennar's new home lots in Davidson County. Standard pricing.",
        notesCustomer: "Gravel delivery for driveway base installation. Please review and approve at your convenience.",
        market: "TN",
        sourceSystem: "aggregateos",
      },
    ])
    .returning();

  await db.insert(estimateLineItems).values([
    {
      estimateId: est2!.id,
      materialId: classAGravel.id,
      originId: blueRidge.id,
      destinationId: oakwood.id,
      quantity: "200",
      materialRate: "24.50",
      haulRate: "16.50",
      fuelSurcharge: "984.00",
      lineTotal: "8500.00",
      distanceMiles: "35.8",
      estimatedDurationMinutes: 55,
    },
  ]);

  const est3Subtotal = "111607.14";
  const est3Fuel = "13392.86";
  const est3Total = "125000.00";

  const [est3] = await db
    .insert(estimates)
    .values([
      {
        entityId: orgId,
        customerId: dotHighway.id,
        estimateNumber: "EST-000003",
        status: "approved",
        subtotal: est3Subtotal,
        fuelSurchargeTotal: est3Fuel,
        total: est3Total,
        validUntil: "2026-06-30",
        sentAt: new Date("2026-01-20T09:00:00Z"),
        sentByUserId: dispatcherUser.id,
        approvedAt: new Date("2026-02-01T14:30:00Z"),
        approvedBy: "Robert Williams — DOT",
        createdBy: dispatcherUser.id,
        notes: "I-85 Bridge expansion — multi-month delivery schedule",
        notesInternal: "I-85 Bridge expansion — multi-month delivery schedule. High-priority DOT contract. Lock in pricing through Q2.",
        notesCustomer: "Materials for I-85 bridge expansion project. Pricing includes all delivery and fuel surcharges. Valid through June 2026.",
        market: "TN",
        sourceSystem: "aggregateos",
      },
    ])
    .returning();

  await db.insert(estimateLineItems).values([
    {
      estimateId: est3!.id,
      materialId: limestone.id,
      originId: eagleRock.id,
      destinationId: i85Bridge.id,
      quantity: "2000",
      materialRate: "18.75",
      haulRate: "12.50",
      fuelSurcharge: "7500.00",
      lineTotal: "70000.00",
      distanceMiles: "15.2",
      estimatedDurationMinutes: 32,
    },
    {
      estimateId: est3!.id,
      materialId: hotMixAsphalt.id,
      originId: centralPlant.id,
      destinationId: i85Bridge.id,
      quantity: "500",
      materialRate: "42.00",
      haulRate: "18.00",
      fuelSurcharge: "4500.00",
      lineTotal: "34500.00",
      distanceMiles: "12.8",
      estimatedDurationMinutes: 28,
    },
    {
      estimateId: est3!.id,
      materialId: crusherRun.id,
      originId: eagleRock.id,
      destinationId: i85Bridge.id,
      quantity: "700",
      materialRate: "16.00",
      haulRate: "11.50",
      fuelSurcharge: "2310.00",
      lineTotal: "21560.00",
      distanceMiles: "15.2",
      estimatedDurationMinutes: 32,
    },
  ]);

  // ── Estimate history events ──────────────────────────────────────────
  log("Inserting estimate history events, comments, versions, recipients...");

  // EST-000001 (Draft) — just a Created event
  await db.insert(estimateHistoryEvents).values([
    {
      estimateId: est1!.id,
      actorType: "user",
      actorId: dispatcherUser.id,
      actorLabel: "Mike Johnson",
      eventType: "created",
      meta: {},
    },
  ]);

  // EST-000002 (Sent) — Created + Sent events, a version, and a recipient
  await db.insert(estimateHistoryEvents).values([
    {
      estimateId: est2!.id,
      timestamp: new Date("2026-02-04T15:00:00Z"),
      actorType: "user",
      actorId: dispatcherUser.id,
      actorLabel: "Mike Johnson",
      eventType: "created",
      meta: {},
    },
    {
      estimateId: est2!.id,
      timestamp: new Date("2026-02-05T10:00:00Z"),
      actorType: "user",
      actorId: dispatcherUser.id,
      actorLabel: "Mike Johnson",
      eventType: "sent",
      meta: { recipients: ["procurement@lennarhomes.com"], versionNumber: 1 },
    },
  ]);

  const [est2Version] = await db
    .insert(estimateVersions)
    .values([
      {
        estimateId: est2!.id,
        versionNumber: 1,
        createdAt: new Date("2026-02-05T10:00:00Z"),
        createdByUserId: dispatcherUser.id,
        snapshotJson: { estimateNumber: "EST-000002", total: est2Total, status: "sent" },
      },
    ])
    .returning();

  await db.insert(estimateRecipients).values([
    {
      estimateId: est2!.id,
      email: "procurement@lennarhomes.com",
      name: "Lennar Procurement",
      sentAt: new Date("2026-02-05T10:00:00Z"),
      deliveryStatus: "sent",
    },
  ]);

  await db.insert(estimateAccessTokens).values([
    {
      token: "seed-token-est2-demo",
      estimateId: est2!.id,
      estimateVersionId: est2Version!.id,
      recipientEmail: "procurement@lennarhomes.com",
      expiresAt: new Date("2026-03-07T10:00:00Z"),
      permissions: "approve_reject",
    },
  ]);

  // EST-000003 (Approved) — full lifecycle: Created → Sent → Viewed → Approved
  await db.insert(estimateHistoryEvents).values([
    {
      estimateId: est3!.id,
      timestamp: new Date("2026-01-15T09:00:00Z"),
      actorType: "user",
      actorId: dispatcherUser.id,
      actorLabel: "Mike Johnson",
      eventType: "created",
      meta: {},
    },
    {
      estimateId: est3!.id,
      timestamp: new Date("2026-01-20T09:00:00Z"),
      actorType: "user",
      actorId: dispatcherUser.id,
      actorLabel: "Mike Johnson",
      eventType: "sent",
      meta: { recipients: ["rwilliams@dot.gov"], versionNumber: 1 },
    },
    {
      estimateId: est3!.id,
      timestamp: new Date("2026-01-21T14:22:00Z"),
      actorType: "customer",
      actorLabel: "rwilliams@dot.gov",
      eventType: "viewed",
      meta: { recipientEmail: "rwilliams@dot.gov" },
    },
    {
      estimateId: est3!.id,
      timestamp: new Date("2026-01-25T11:00:00Z"),
      actorType: "customer",
      actorLabel: "rwilliams@dot.gov",
      eventType: "commented",
      meta: { body: "Can you confirm the delivery schedule?" },
    },
    {
      estimateId: est3!.id,
      timestamp: new Date("2026-01-25T14:30:00Z"),
      actorType: "user",
      actorId: dispatcherUser.id,
      actorLabel: "Mike Johnson",
      eventType: "commented",
      meta: { body: "Delivery begins March 1, weekly drops of ~100 tons limestone, 50 tons asphalt." },
    },
    {
      estimateId: est3!.id,
      timestamp: new Date("2026-02-01T14:30:00Z"),
      actorType: "customer",
      actorLabel: "rwilliams@dot.gov",
      eventType: "approved",
      meta: { versionNumber: 1, recipientEmail: "rwilliams@dot.gov" },
    },
  ]);

  const [est3Version] = await db
    .insert(estimateVersions)
    .values([
      {
        estimateId: est3!.id,
        versionNumber: 1,
        createdAt: new Date("2026-01-20T09:00:00Z"),
        createdByUserId: dispatcherUser.id,
        snapshotJson: { estimateNumber: "EST-000003", total: est3Total, status: "sent" },
      },
    ])
    .returning();

  await db.insert(estimateRecipients).values([
    {
      estimateId: est3!.id,
      email: "rwilliams@dot.gov",
      name: "Robert Williams",
      sentAt: new Date("2026-01-20T09:00:00Z"),
      deliveryStatus: "sent",
      lastViewedAt: new Date("2026-01-21T14:22:00Z"),
    },
  ]);

  await db.insert(estimateComments).values([
    {
      estimateId: est3!.id,
      authorType: "customer",
      authorLabel: "rwilliams@dot.gov",
      body: "Can you confirm the delivery schedule?",
      createdAt: new Date("2026-01-25T11:00:00Z"),
    },
    {
      estimateId: est3!.id,
      authorType: "user",
      authorId: dispatcherUser.id,
      authorLabel: "Mike Johnson",
      body: "Delivery begins March 1, weekly drops of ~100 tons limestone, 50 tons asphalt. We'll coordinate with your site manager on exact timing.",
      createdAt: new Date("2026-01-25T14:30:00Z"),
    },
    {
      estimateId: est3!.id,
      authorType: "customer",
      authorLabel: "rwilliams@dot.gov",
      body: "Perfect, approved. Please proceed with the order.",
      createdAt: new Date("2026-02-01T14:30:00Z"),
    },
  ]);

  // =========================================================================
  // 10b. Projects
  // =========================================================================
  log("Inserting projects...");

  const insertedProjects = await db
    .insert(projects)
    .values([
      {
        entityId: orgId,
        customerId: dotHighway.id,
        name: "I-85 Bridge Expansion",
        description:
          "Multi-month DOT bridge expansion project requiring limestone, asphalt, and crusher run",
        status: "active",
        startDate: "2026-01-15",
        endDate: "2026-12-31",
      },
      {
        entityId: orgId,
        customerId: lennarHomes.id,
        name: "Oakwood Subdivision Phase 3",
        description:
          "Residential subdivision development — driveways, roads, and grading",
        status: "active",
        startDate: "2026-02-01",
        endDate: "2026-08-31",
      },
    ])
    .returning();

  const projectI85 = insertedProjects[0]!;
  const projectOakwood = insertedProjects[1]!;

  // =========================================================================
  // 11. Orders (with orderType, projectId, billingTerms)
  // =========================================================================
  log("Inserting orders...");

  const insertedOrders = await db
    .insert(orders)
    .values([
      {
        entityId: orgId,
        estimateId: est3!.id,
        customerId: dotHighway.id,
        projectId: projectI85.id,
        orderNumber: "ORD-000001",
        orderType: "material_haul",
        materialId: limestone.id,
        originId: eagleRock.id,
        destinationId: i85Bridge.id,
        quantityOrdered: "500",
        quantityDelivered: "110",
        status: "active",
        scheduledDate: "2026-02-14",
        billingTerms: "net_60",
        notes: "Week 1 delivery batch — I-85 bridge project",
      },
      {
        entityId: orgId,
        estimateId: est3!.id,
        customerId: dotHighway.id,
        projectId: projectI85.id,
        orderNumber: "ORD-000002",
        orderType: "material_haul",
        materialId: hotMixAsphalt.id,
        originId: centralPlant.id,
        destinationId: i85Bridge.id,
        quantityOrdered: "250",
        quantityDelivered: "0",
        status: "active",
        scheduledDate: "2026-02-17",
        billingTerms: "net_60",
        specialConstraints: "Night paving only — 8PM to 5AM",
        notes: "Asphalt overlay — pending paving crew schedule",
      },
    ])
    .returning();

  const order1 = insertedOrders[0]!;
  const order2 = insertedOrders[1]!;

  // =========================================================================
  // 11b. Dispatches
  // =========================================================================
  log("Inserting dispatches...");

  const [dispatch1] = await db
    .insert(dispatches)
    .values([
      {
        entityId: orgId,
        orderId: order1.id,
        dispatchedBy: dispatcherUser.id,
        loadCount: 5,
        notes: "Morning batch dispatch for I-85 limestone delivery",
      },
    ])
    .returning();

  // =========================================================================
  // 12. Loads (with pricing + dispatchId)
  // =========================================================================
  log("Inserting loads...");

  const now = new Date();
  const todayMorning = new Date(now);
  todayMorning.setHours(7, 0, 0, 0);

  const insertedLoads = await db
    .insert(loads)
    .values([
      // LD-000001: delivered
      {
        entityId: orgId,
        orderId: order1.id,
        driverId: driverMike.id,
        vehicleId: kenworthTruck.id,
        dispatchId: dispatch1!.id,
        loadNumber: "LD-000001",
        status: "delivered",
        scheduledPickupTime: new Date(todayMorning.getTime()),
        actualPickupTime: new Date(todayMorning.getTime() + 5 * 60_000),
        scheduledDeliveryTime: new Date(
          todayMorning.getTime() + 45 * 60_000,
        ),
        actualDeliveryTime: new Date(todayMorning.getTime() + 42 * 60_000),
        invoiceRatePerTon: "31.25",
        driverPayRate: "8.50",
        fuelSurchargeAmount: "82.50",
        billableTons: "22.00",
        notes: "Delivered 22 tons — smooth run",
      },
      // LD-000002: en_route_delivery
      {
        entityId: orgId,
        orderId: order1.id,
        driverId: driverCarlos.id,
        vehicleId: peterbiltTruck.id,
        dispatchId: dispatch1!.id,
        loadNumber: "LD-000002",
        status: "en_route_delivery",
        scheduledPickupTime: new Date(
          todayMorning.getTime() + 60 * 60_000,
        ),
        actualPickupTime: new Date(todayMorning.getTime() + 63 * 60_000),
        scheduledDeliveryTime: new Date(
          todayMorning.getTime() + 105 * 60_000,
        ),
        invoiceRatePerTon: "31.25",
        driverPayRate: "9.50",
        fuelSurchargeAmount: "75.00",
        notes: "Currently en route with 20 tons",
      },
      // LD-000003: assigned
      {
        entityId: orgId,
        orderId: order1.id,
        driverId: driverTommy.id,
        vehicleId: mackTruck.id,
        dispatchId: dispatch1!.id,
        loadNumber: "LD-000003",
        status: "assigned",
        scheduledPickupTime: new Date(
          todayMorning.getTime() + 120 * 60_000,
        ),
        scheduledDeliveryTime: new Date(
          todayMorning.getTime() + 165 * 60_000,
        ),
        invoiceRatePerTon: "31.25",
        driverPayRate: "10.00",
      },
      // LD-000004: ordered (unassigned)
      {
        entityId: orgId,
        orderId: order1.id,
        dispatchId: dispatch1!.id,
        loadNumber: "LD-000004",
        status: "ordered",
        scheduledPickupTime: new Date(
          todayMorning.getTime() + 180 * 60_000,
        ),
        scheduledDeliveryTime: new Date(
          todayMorning.getTime() + 225 * 60_000,
        ),
        invoiceRatePerTon: "31.25",
      },
      // LD-000005: ticket_verified
      {
        entityId: orgId,
        orderId: order1.id,
        driverId: driverDerek.id,
        dispatchId: dispatch1!.id,
        loadNumber: "LD-000005",
        status: "ticket_verified",
        scheduledPickupTime: new Date(
          todayMorning.getTime() - 120 * 60_000,
        ),
        actualPickupTime: new Date(todayMorning.getTime() - 118 * 60_000),
        scheduledDeliveryTime: new Date(
          todayMorning.getTime() - 75 * 60_000,
        ),
        actualDeliveryTime: new Date(todayMorning.getTime() - 78 * 60_000),
        invoiceRatePerTon: "31.25",
        driverPayRate: "9.00",
        fuelSurchargeAmount: "82.50",
        billableTons: "22.00",
        notes: "Ticket verified — awaiting billing",
      },
      // LD-000006: billable
      {
        entityId: orgId,
        orderId: order2.id,
        driverId: driverBobby.id,
        loadNumber: "LD-000006",
        status: "billable",
        scheduledPickupTime: new Date(
          todayMorning.getTime() - 240 * 60_000,
        ),
        actualPickupTime: new Date(todayMorning.getTime() - 237 * 60_000),
        scheduledDeliveryTime: new Date(
          todayMorning.getTime() - 195 * 60_000,
        ),
        actualDeliveryTime: new Date(todayMorning.getTime() - 198 * 60_000),
        invoiceRatePerTon: "60.00",
        driverPayRate: "12.00",
        fuelSurchargeAmount: "180.00",
        billableTons: "20.00",
        notes: "Ready for invoicing",
      },
    ])
    .returning();

  // =========================================================================
  // 13. Summary
  // =========================================================================
  console.log("\n" + "=".repeat(60));
  console.log("  AggregateOS Seed Complete!");
  console.log("=".repeat(60));
  console.log(
    `  Seeded: 1 organization, ${insertedUsers.length} users, ` +
      `${insertedCustomers.length} customers, ${insertedLocations.length} locations, ` +
      `${insertedMaterials.length} materials, ${insertedRateCards.length} rate cards, ` +
      `3 estimates, ${insertedOrders.length} orders, ` +
      `${insertedProjects.length} projects, ` +
      `${insertedDrivers.length} drivers, ${insertedVehicles.length} vehicles, ` +
      `${insertedLoads.length} loads`,
  );
  console.log("=".repeat(60) + "\n");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

seed()
  .then(() => {
    log("Done.");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
