export const getPickOrder = (numPicks, firstPicker, type) => {
  const order = [];
  const secondPicker = firstPicker === 'Light' ? 'Dark' : 'Light';

  if (type === 'simple') {
    let currentPicker = firstPicker;
    for (let i = 0; i < numPicks; i++) {
      order.push(currentPicker);
      currentPicker = (currentPicker === firstPicker) ? secondPicker : firstPicker;
    }
  } else { // Serpentine (A, B, B, A)
    for (let i = 0; i < numPicks; i++) {
      const round = Math.floor(i / 2); // Round (0, 1, 2...)
      const pickInRound = i % 2; // Pick within the round (0 or 1)

      if (round % 2 === 1) { // Odd rounds (1, 3...) are reverse order
        order.push(pickInRound === 0 ? secondPicker : firstPicker);
      } else { // Even rounds (0, 2...) are standard order
        order.push(pickInRound === 0 ? firstPicker : secondPicker);
      }
    }

    // Correction for odd numbers to ensure team sizes are balanced.
    // The first picker should always get the extra player.
    if (numPicks % 2 !== 0) {
      const firstPickerCount = order.filter(p => p === firstPicker).length;
      if (firstPickerCount < numPicks - firstPickerCount) {
        order[numPicks - 1] = firstPicker; // Swap last pick if balance is wrong
      }
    }
  }
  return order;
};
