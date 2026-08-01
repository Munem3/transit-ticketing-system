// Enumerated values are stored as plain strings in SQLite (Prisma enums are not
// supported by the SQLite connector). These unions + constants give us the same
// type-safety and a single source of truth.

export type Role = "USER" | "ADMIN";
export type TransportMode = "BUS" | "TRAIN" | "METRO";
export type SeatStatus = "AVAILABLE" | "HELD" | "BOOKED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "EXPIRED";
export type WalletProvider = "BKASH" | "ROCKET" | "CARD";
export type TxnType = "TOPUP" | "PURCHASE" | "REFUND";

export const WALLET_PROVIDERS: WalletProvider[] = ["BKASH", "ROCKET", "CARD"];
export const TRANSPORT_MODES: TransportMode[] = ["BUS", "TRAIN", "METRO"];
