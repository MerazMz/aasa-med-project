// Supported units
export type SupportedUnit = "GRAM" | "KILOGRAM" | "MILLILITER" | "LITER" | "ITEM";

// Define base units for each category
export const BASE_UNITS = {
  WEIGHT: "GRAM" as const,
  VOLUME: "MILLILITER" as const,
  COUNT: "ITEM" as const,
};

// Check if units belong to the same dimension group
export function getUnitGroup(unit: SupportedUnit): "WEIGHT" | "VOLUME" | "COUNT" {
  if (unit === "GRAM" || unit === "KILOGRAM") return "WEIGHT";
  if (unit === "MILLILITER" || unit === "LITER") return "VOLUME";
  return "COUNT";
}

// Get the base unit for a given unit
export function getBaseUnit(unit: SupportedUnit): SupportedUnit {
  const group = getUnitGroup(unit);
  if (group === "WEIGHT") return BASE_UNITS.WEIGHT;
  if (group === "VOLUME") return BASE_UNITS.VOLUME;
  return BASE_UNITS.COUNT;
}

// Get conversion factor to base unit
// e.g. how many base units in 1 input unit?
// 1 KILOGRAM = 1000 GRAMS (factor is 1000)
// 1 LITER = 1000 MILLILITERS (factor is 1000)
export function getConversionFactorToBase(unit: SupportedUnit): number {
  switch (unit) {
    case "KILOGRAM":
      return 1000;
    case "LITER":
      return 1000;
    case "GRAM":
    case "MILLILITER":
    case "ITEM":
    default:
      return 1;
  }
}

/**
 * Converts a quantity from an input unit to its base unit.
 * e.g., 5 kg -> 5000 g
 */
export function convertQuantityToBase(quantity: number, unit: SupportedUnit): number {
  const factor = getConversionFactorToBase(unit);
  return quantity * factor;
}

/**
 * Converts a price per input unit to a price per base unit.
 * e.g., 500 INR/kg -> 0.5 INR/g
 */
export function convertPriceToBase(price: number, unit: SupportedUnit): number {
  const factor = getConversionFactorToBase(unit);
  return price / factor;
}

/**
 * Converts a quantity from the base unit to a target display unit.
 * e.g., 5000 g -> 5 kg
 */
export function convertQuantityFromBase(quantity: number, targetUnit: SupportedUnit): number {
  const factor = getConversionFactorToBase(targetUnit);
  return quantity / factor;
}

/**
 * Converts a price from the base unit to a target display unit.
 * e.g., 0.5 INR/g -> 500 INR/kg
 */
export function convertPriceFromBase(price: number, targetUnit: SupportedUnit): number {
  const factor = getConversionFactorToBase(targetUnit);
  return price * factor;
}

/**
 * Returns user-friendly abbreviation for a unit.
 */
export function getUnitAbbreviation(unit: SupportedUnit): string {
  switch (unit) {
    case "GRAM":
      return "g";
    case "KILOGRAM":
      return "kg";
    case "MILLILITER":
      return "mL";
    case "LITER":
      return "L";
    case "ITEM":
      return "items";
    default:
      return "";
  }
}
