import QRCode from "qrcode";

/**
 * Encode a booking payload into a scannable QR code, returned as a PNG data URL
 * suitable for an <img src>. The payload is a compact JSON string that a gate
 * scanner could verify against the bookings table.
 */
export async function makeQrDataUrl(payload: string): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    scale: 6,
    color: { dark: "#0b1220", light: "#ffffff" },
  });
}

export function buildQrPayload(booking: {
  reference: string;
  tripId: string;
  userId: string;
}): string {
  return JSON.stringify({
    v: 1,
    ref: booking.reference,
    trip: booking.tripId,
    uid: booking.userId,
    ts: Date.now(),
  });
}
