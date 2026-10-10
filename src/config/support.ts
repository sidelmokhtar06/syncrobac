// "اشري للمطور كافه" — the developer's wallets. Fill in the numbers; a wallet with an
// empty number is hidden. Nothing here is sent anywhere: the student copies the number
// and pays from their own wallet app.
export const SUPPORT = {
  name: '', // account holder name shown under the number (optional)
  wallets: [
    { id: 'bankily', name: 'Bankily', number: '37 36 06 96' },
    { id: 'masrvi', name: 'Masrvi', number: '37 36 06 96' },
    { id: 'sedad', name: 'Sedad', number: '37 36 06 96' },
  ],
}

// Suggested amounts (MRU), each with a playful label.
export const COFFEE_AMOUNTS = [
  { mru: 50, fr: 'Un café', ar: 'كأس قهوة' },
  { mru: 100, fr: 'Café + gâteau', ar: 'قهوة وكعكة' },
  { mru: 200, fr: 'Un atay complet', ar: 'أتاي كامل' },
  { mru: 500, fr: 'Le mécène', ar: 'الداعم الكبير' },
]
