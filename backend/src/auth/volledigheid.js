// Watter velde 'n volledige profiel nodig het.
//
// Dit is die EEN plek waar hierdie reël staan. Die backend
// gebruik dit om die lys van ontbrekende velde te bereken, en
// die frontend teken net wat dit terugkry. So kan die twee
// nooit uit pas raak nie.

const VELDE = [
  {
    naam: 'first_name',
    etiket: 'Naam',
    tipe: 'text',
    verpligtend: true,
    autoComplete: 'given-name',
  },
  {
    naam: 'last_name',
    etiket: 'Van',
    tipe: 'text',
    verpligtend: true,
    autoComplete: 'family-name',
  },
  {
    naam: 'contact_number',
    etiket: 'Kontaknommer',
    tipe: 'tel',
    verpligtend: true,
    autoComplete: 'tel',
    hulp: 'Ons gebruik dit net om jou oor projekte te kontak.',
  },
  {
    naam: 'date_of_birth',
    etiket: 'Geboortedatum',
    tipe: 'date',
    verpligtend: true,
    autoComplete: 'bday',
  },
  {
    naam: 'gender',
    etiket: 'Geslag',
    tipe: 'keuse',
    verpligtend: true,
    keuses: ['Manlik', 'Vroulik', 'Ander', 'Sê liewer nie'],
  },
  {
    naam: 'location_lat',
    etiket: 'Ligging',
    tipe: 'ligging',
    verpligtend: true,
    hulp: 'Ons gebruik dit om projekte naby jou te wys.',
  },
];

/**
 * Watter velde ontbreek op hierdie rekening?
 *
 * Gee 'n lys terug wat die frontend direk kan teken. Leeg
 * beteken die profiel is volledig.
 */
function ontbrekendeVelde(gebruiker) {
  const ontbreek = [];

  for (const veld of VELDE) {
    // Ligging is twee kolomme wat saam een ding maak. Albei
    // moet daar wees, anders is dit nie 'n ligging nie.
    if (veld.naam === 'location_lat') {
      const hetLigging =
        gebruiker.location_lat !== null &&
        gebruiker.location_lat !== undefined &&
        gebruiker.location_lng !== null &&
        gebruiker.location_lng !== undefined;

      if (!hetLigging) ontbreek.push(veld);
      continue;
    }

    const waarde = gebruiker[veld.naam];
    const leeg =
      waarde === null ||
      waarde === undefined ||
      (typeof waarde === 'string' && waarde.trim() === '');

    if (leeg) ontbreek.push(veld);
  }

  return ontbreek;
}

module.exports = { VELDE, ontbrekendeVelde };
