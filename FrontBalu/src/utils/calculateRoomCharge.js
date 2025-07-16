export function calculateRoomCharge(room, guestCount, nights) {
  let pricePerNight = 0;

  if (guestCount === 1 && room.priceSingle) {
    pricePerNight = parseFloat(room.priceSingle);
  } else if (guestCount === 2 && room.priceDouble) {
    pricePerNight = parseFloat(room.priceDouble);
  } else if (guestCount >= 3 && room.priceMultiple) {
    pricePerNight = parseFloat(room.priceMultiple);
  }

  if (room.isPromo && room.promotionPrice) {
    pricePerNight = parseFloat(room.promotionPrice);
  }

  return pricePerNight * nights;
}