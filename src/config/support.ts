// "اشري للمطور كافه" — the developer's wallets. Fill in the numbers; a wallet with an
// empty number is hidden. Nothing here is sent anywhere: the student copies the number
// and pays from their own wallet app.
export const SUPPORT = {
  name: 'Sidi El Moctar', // shown as the account holder
  wallets: [
    { id: 'bankily', name: 'Bankily', number: '' },
    { id: 'masrvi', name: 'Masrvi', number: '' },
    { id: 'sedad', name: 'Sedad', number: '' },
  ],
}

// Suggested amounts (MRU), each with a playful label.
export const COFFEE_AMOUNTS = [
  { mru: 50, fr: 'Un café', ar: 'كأس قهوة' },
  { mru: 100, fr: 'Café + gâteau', ar: 'قهوة وكعكة' },
  { mru: 200, fr: 'Un atay complet', ar: 'أتاي كامل' },
  { mru: 500, fr: 'Le mécène', ar: 'الداعم الكبير' },
]
