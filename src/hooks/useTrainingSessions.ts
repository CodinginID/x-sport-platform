export interface SlotInfo { filled: number; capacity: number; isFull: boolean; }

/** Hitung status slot sesi. "Penuh" diturunkan, tidak disimpan. */
export function slotInfo(filled: number, capacity: number): SlotInfo {
  return { filled, capacity, isFull: filled >= capacity };
}
