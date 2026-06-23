import type { Service, WellTime, PricingSchedule, PricingScheduleWellClass } from "./schema";

export const WELL_CLASSES = [
  "MISHRIF VERTICAL",
  "MISHRIF DEVIATED",
  "NAHR UMR VERTICAL",
  "ZUBAIR VERTICAL",
  "ZUBAIR DEVIATED",
] as const;

export type WellClass = (typeof WELL_CLASSES)[number];

export const WELL_CLASS_SHORT: Record<string, string> = {
  "MISHRIF VERTICAL": "MV",
  "MISHRIF DEVIATED": "MD",
  "NAHR UMR VERTICAL": "NUV",
  "ZUBAIR VERTICAL": "ZV",
  "ZUBAIR DEVIATED": "ZD",
};

export const RIG_COLUMNS = [
  { key: "rig607SevP90", label: "607 SEV P90" },
  { key: "rig607Cev", label: "607 CEV" },
  { key: "rig768SevP90", label: "768 SEV P90" },
  { key: "rig768Cev", label: "768 CEV" },
  { key: "rig814SevP90", label: "814 SEV P90" },
  { key: "rig814Cev", label: "814 CEV" },
] as const;

export type RigColumnKey = (typeof RIG_COLUMNS)[number]["key"];

export const WELL_TYPE_DISCOUNTS: Record<string, number> = {
  "MISHRIF VERTICAL": 1.0,
  "MISHRIF DEVIATED": 1.0,
  "NAHR UMR VERTICAL": 1.0,
  "ZUBAIR VERTICAL": 1.0,
  "ZUBAIR DEVIATED": 1.0,
};

export interface WellClassMatrixCell {
  wellClass: string;
  scheduleId: number | null;
  wellClassRowId: number | null;
  baseUnitPrice: number;
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  resolvedDays: number | null;
  estimatedHours: number | null;
  singleWellQty: number;
  qtySlb: number;
  qtyCli: number;
  rig607SevP90: number | null;
  rig607Cev: number | null;
  rig768SevP90: number | null;
  rig768Cev: number | null;
  rig814SevP90: number | null;
  rig814Cev: number | null;
  isUnpriced: boolean;
  isActive: boolean;
  appliedMarkup: number;
  appliedWellDiscount: number;
  defaultMarkup: number;
}

export interface SelectedServiceMatrix {
  service: Service;
  cells: WellClassMatrixCell[];
  totalPrice: number;
}

export interface WellClassSummary {
  wellClass: string;
  subtotal: number;
  serviceCount: number;
}

export interface MatrixTotals extends ReturnType<typeof calculatePricingTotals> {
  wellClassSummaries: WellClassSummary[];
}

export function getServiceMarkup(service: Service): number {
  if (service.serviceType === "ThirdParty" || service.serviceType === "Riskpot") {
    return parseFloat(service.tpMarkup ?? "1.15");
  }
  return parseFloat(service.segmentMarkup ?? "1.0");
}

export function resolveWellTime(
  wellTimes: WellTime[],
  serviceId: number,
  wellClass: string,
  sectionCode?: string | null,
  scenarioOption?: number,
): WellTime | undefined {
  const filtered = wellTimes.filter(
    (wt) => !scenarioOption || !wt.scenarioOption || wt.scenarioOption === scenarioOption,
  );

  return (
    filtered.find((wt) => {
      if (wt.serviceId !== serviceId) return false;
      if (wt.wellClass && wt.wellClass !== wellClass) return false;
      if (sectionCode && wt.sectionCode && wt.sectionCode !== sectionCode) return false;
      return true;
    }) ?? filtered.find((wt) => wt.serviceId === serviceId && !wt.wellClass)
  );
}

export function getBasketQty(
  wellClassRow: PricingScheduleWellClass | null | undefined,
  wellBasket: "SLB" | "Client" | string,
  fallback = 1,
): number {
  if (!wellClassRow) return fallback;
  return wellBasket === "Client" ? (wellClassRow.qtyCli ?? fallback) : (wellClassRow.qtySlb ?? fallback);
}

export function getRigUnitPrice(
  wellClassRow: PricingScheduleWellClass | null | undefined,
  rigKey: RigColumnKey,
  fallbackUnitPrice: number,
): number {
  if (!wellClassRow) return fallbackUnitPrice;
  const val = wellClassRow[rigKey];
  if (val == null || val === "") return fallbackUnitPrice;
  const parsed = parseFloat(String(val));
  return parsed > 0 ? parsed : fallbackUnitPrice;
}

export function resolveQuantity(
  service: Service,
  wellClass: string,
  wellTimes: WellTime[],
  projectDuration: number,
  pricingDuration?: number | null,
  scenarioOption?: number,
): { quantity: number; resolvedDays: number | null; estimatedHours: number | null } {
  if (service.pricingType === "Lumpsum" || service.pricingType === "None") {
    return { quantity: 1, resolvedDays: null, estimatedHours: null };
  }

  if (service.pricingType === "Per Day") {
    const wellTime = resolveWellTime(wellTimes, service.id, wellClass, service.itemCode, scenarioOption);
    if (wellTime?.totalDays) {
      const days = parseFloat(String(wellTime.totalDays));
      return { quantity: days, resolvedDays: days, estimatedHours: wellTime.estimatedTime };
    }
    if (wellTime?.estimatedTime) {
      const days = parseFloat((wellTime.estimatedTime / 24).toFixed(4));
      return { quantity: days, resolvedDays: days, estimatedHours: wellTime.estimatedTime };
    }
    return { quantity: projectDuration, resolvedDays: projectDuration, estimatedHours: projectDuration * 24 };
  }

  if (pricingDuration && pricingDuration > 0) {
    return { quantity: pricingDuration, resolvedDays: null, estimatedHours: null };
  }

  return { quantity: 1, resolvedDays: null, estimatedHours: null };
}

export function calculateEffectivePrice(
  unitPrice: number,
  service: Service,
  wellClass: string,
  markupOverride?: number,
  wellDiscountOverride?: number,
): number {
  const markup = markupOverride ?? getServiceMarkup(service);
  const wellDiscount = wellDiscountOverride ?? (WELL_TYPE_DISCOUNTS[wellClass] ?? 1.0);
  return unitPrice * markup * wellDiscount;
}

export interface BuildMatrixCellInput {
  service: Service;
  wellClass: string;
  schedule: PricingSchedule | null;
  wellClassRow: PricingScheduleWellClass | null;
  wellTimes: WellTime[];
  projectDuration: number;
  wellBasket: string;
  wellTypeDiscount: number;
  wellClassDiscounts?: Record<string, number>;
  markupOverride?: number;
  scenarioOption: number;
  selectedRig?: RigColumnKey;
  isActive: boolean;
}

export function buildMatrixCell(input: BuildMatrixCellInput): WellClassMatrixCell {
  const {
    service,
    wellClass,
    schedule,
    wellClassRow,
    wellTimes,
    projectDuration,
    wellBasket,
    wellTypeDiscount,
    wellClassDiscounts,
    markupOverride,
    scenarioOption,
    selectedRig,
    isActive,
  } = input;

  const scheduleUnit = schedule ? parseFloat(schedule.unitPrice ?? "0") : parseFloat(service.baseRate ?? "0");
  const baseUnitPrice = selectedRig
    ? getRigUnitPrice(wellClassRow, selectedRig, scheduleUnit)
    : scheduleUnit;

  const isUnpriced = !schedule || baseUnitPrice === 0;
  const defaultMarkup = getServiceMarkup(service);
  const appliedMarkup = markupOverride ?? defaultMarkup;
  const appliedWellDiscount =
    wellClassDiscounts?.[wellClass] ?? wellTypeDiscount ?? (WELL_TYPE_DISCOUNTS[wellClass] ?? 1.0);
  const unitPrice = baseUnitPrice * appliedMarkup * appliedWellDiscount;

  const { quantity: timeQty, resolvedDays, estimatedHours } = resolveQuantity(
    service,
    wellClass,
    wellTimes,
    projectDuration,
    schedule?.duration,
    scenarioOption,
  );

  const basketQty = getBasketQty(wellClassRow, wellBasket, schedule?.singleWellQty ?? 1);
  const quantity =
    service.pricingType === "Per Day" ? parseFloat((timeQty * basketQty).toFixed(4)) : timeQty * basketQty;

  return {
    wellClass,
    scheduleId: schedule?.id ?? null,
    wellClassRowId: wellClassRow?.id ?? null,
    baseUnitPrice,
    unitPrice,
    quantity,
    totalPrice: isActive ? unitPrice * quantity : 0,
    resolvedDays,
    estimatedHours,
    singleWellQty: wellClassRow?.singleWellQty ?? schedule?.singleWellQty ?? 1,
    qtySlb: wellClassRow?.qtySlb ?? 1,
    qtyCli: wellClassRow?.qtyCli ?? 1,
    rig607SevP90: wellClassRow?.rig607SevP90 ? parseFloat(String(wellClassRow.rig607SevP90)) : null,
    rig607Cev: wellClassRow?.rig607Cev ? parseFloat(String(wellClassRow.rig607Cev)) : null,
    rig768SevP90: wellClassRow?.rig768SevP90 ? parseFloat(String(wellClassRow.rig768SevP90)) : null,
    rig768Cev: wellClassRow?.rig768Cev ? parseFloat(String(wellClassRow.rig768Cev)) : null,
    rig814SevP90: wellClassRow?.rig814SevP90 ? parseFloat(String(wellClassRow.rig814SevP90)) : null,
    rig814Cev: wellClassRow?.rig814Cev ? parseFloat(String(wellClassRow.rig814Cev)) : null,
    isUnpriced,
    isActive,
    appliedMarkup,
    appliedWellDiscount,
    defaultMarkup,
  };
}

export function buildServiceMatrix(
  service: Service,
  activeWellClasses: string[],
  pricingSchedules: PricingSchedule[],
  wellClassRows: PricingScheduleWellClass[],
  wellTimes: WellTime[],
  config: {
    projectDuration: number;
    wellBasket: string;
    wellTypeDiscount: number;
    wellClassDiscounts?: Record<string, number>;
    markupOverrides?: Record<number, number>;
    scenarioOption: number;
    selectedRig?: RigColumnKey;
  },
): SelectedServiceMatrix {
  const cells = activeWellClasses.map((wellClass) => {
    const schedule =
      pricingSchedules.find(
        (ps) => ps.serviceId === service.id && (ps.wellClass === wellClass || ps.wellType === wellClass),
      ) ?? null;
    const wellClassRow = schedule
      ? wellClassRows.find((wc) => wc.scheduleId === schedule.id && wc.wellClass === wellClass) ?? null
      : null;

    return buildMatrixCell({
      service,
      wellClass,
      schedule,
      wellClassRow,
      wellTimes,
      projectDuration: config.projectDuration,
      wellBasket: config.wellBasket,
      wellTypeDiscount: config.wellTypeDiscount,
      wellClassDiscounts: config.wellClassDiscounts,
      markupOverride: config.markupOverrides?.[service.id],
      scenarioOption: config.scenarioOption,
      selectedRig: config.selectedRig,
      isActive: true,
    });
  });

  return {
    service,
    cells,
    totalPrice: cells.reduce((sum, c) => sum + c.totalPrice, 0),
  };
}

export function calculateMatrixSubtotal(selected: SelectedServiceMatrix[]): number {
  return selected.reduce((sum, row) => sum + row.cells.reduce((cs, c) => cs + (c.isActive ? c.totalPrice : 0), 0), 0);
}

export function calculateWellClassSummaries(selected: SelectedServiceMatrix[]): WellClassSummary[] {
  const map = new Map<string, { subtotal: number; serviceCount: number }>();

  for (const row of selected) {
    for (const cell of row.cells) {
      if (!cell.isActive) continue;
      const existing = map.get(cell.wellClass) ?? { subtotal: 0, serviceCount: 0 };
      existing.subtotal += cell.totalPrice;
      if (cell.totalPrice > 0) existing.serviceCount += 1;
      map.set(cell.wellClass, existing);
    }
  }

  return Array.from(map.entries()).map(([wellClass, data]) => ({
    wellClass,
    subtotal: data.subtotal,
    serviceCount: data.serviceCount,
  }));
}

export interface PricingTotalsInput {
  subtotal: number;
  taxRate: number;
  contingencyRate: number;
  exchangeRate?: number;
}

export function calculatePricingTotals({
  subtotal,
  taxRate,
  contingencyRate,
  exchangeRate = 1,
}: PricingTotalsInput) {
  const tax = subtotal * (taxRate / 100);
  const contingency = subtotal * (contingencyRate / 100);
  const total = subtotal + tax + contingency;
  const localTotal = total * exchangeRate;

  return { subtotal, tax, contingency, total, localTotal };
}

export function calculateMatrixTotals(
  selected: SelectedServiceMatrix[],
  config: PricingTotalsInput,
): MatrixTotals {
  const subtotal = calculateMatrixSubtotal(selected);
  const totals = calculatePricingTotals({ ...config, subtotal });
  return {
    ...totals,
    wellClassSummaries: calculateWellClassSummaries(selected),
  };
}

export function inferServiceType(segment: string, name: string): "Segment" | "ThirdParty" | "Riskpot" {
  const upperName = name.toUpperCase();
  if (upperName.includes("RISKPOT") || upperName.includes("BIDDING COST") || upperName.includes("ANNEX ADJUST")) {
    return "Riskpot";
  }
  if (segment.startsWith("PTP-") || segment.startsWith("PTP")) {
    return "ThirdParty";
  }
  return "Segment";
}

export function parseItemCode(uniqueCode: string): { sectionCode: string; description: string } {
  const parts = uniqueCode.split(">");
  if (parts.length >= 2) {
    return { sectionCode: parts[0].trim(), description: parts.slice(1).join(">").trim() };
  }
  const match = uniqueCode.match(/^([A-Z]+\.\d+)/);
  return {
    sectionCode: match ? match[1] : uniqueCode,
    description: uniqueCode,
  };
}

export interface MarkupTableRow {
  serviceId: number;
  serviceName: string;
  segment: string;
  serviceType: string;
  defaultMarkup: number;
  appliedMarkup: number;
  cells: Array<{
    wellClass: string;
    wellDiscount: number;
    basePrice: number;
    effectivePrice: number;
    netMarkup: number;
  }>;
}

export function recalculateCellPricing(
  cell: Pick<WellClassMatrixCell, "baseUnitPrice" | "quantity" | "isActive">,
  appliedMarkup: number,
  appliedWellDiscount: number,
): Pick<WellClassMatrixCell, "unitPrice" | "totalPrice"> {
  const unitPrice = cell.baseUnitPrice * appliedMarkup * appliedWellDiscount;
  return {
    unitPrice,
    totalPrice: cell.isActive ? unitPrice * cell.quantity : 0,
  };
}

export function buildMarkupTableRows(
  selectedMatrix: SelectedServiceMatrix[],
  activeWellClasses: string[],
  wellClassDiscounts: Record<string, number>,
): MarkupTableRow[] {
  return selectedMatrix.map((row) => ({
    serviceId: row.service.id,
    serviceName: row.service.name,
    segment: row.service.segment,
    serviceType: row.service.serviceType ?? "Segment",
    defaultMarkup: getServiceMarkup(row.service),
    appliedMarkup: row.cells[0]?.appliedMarkup ?? getServiceMarkup(row.service),
    cells: activeWellClasses.map((wellClass) => {
      const cell = row.cells.find((c) => c.wellClass === wellClass);
      const wellDiscount = cell?.appliedWellDiscount ?? wellClassDiscounts[wellClass] ?? 1;
      const basePrice = cell?.baseUnitPrice ?? 0;
      const effectivePrice = cell?.unitPrice ?? 0;
      return {
        wellClass,
        wellDiscount,
        basePrice,
        effectivePrice,
        netMarkup: basePrice > 0 ? effectivePrice / basePrice : 0,
      };
    }),
  }));
}

export function findScheduleForWellClass(
  schedules: PricingSchedule[],
  serviceId: number,
  wellClass: string,
): PricingSchedule | undefined {
  return schedules.find(
    (ps) => ps.serviceId === serviceId && (ps.wellClass === wellClass || ps.wellType === wellClass),
  );
}
