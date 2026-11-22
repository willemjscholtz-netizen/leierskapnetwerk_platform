import Merk from './Merk';
import GebruikersIkoon from './GebruikersIkoon';
import './Kopbalk.css';

/**
 * Die kopbalk wat op elke bladsy bo-aan staan.
 *
 * merk:      wat links staan (gewoonlik die kenteken)
 * voor:      'n knoppie voor die kenteken (bv. Terug)
 * gebruiker: as daar een is, kom die gebruikersikoon regs
 */
export default function Kopbalk({ merk, voor, gebruiker, opProfiel, opUitteken, regs }) {
  return (
    <div className="kopbalk">
      <div className="kopbalk__links">
        {voor}
        {merk ?? <Merk />}
      </div>

      <div className="kopbalk__regs">
        {regs}
        {gebruiker && (
          <GebruikersIkoon
            gebruiker={gebruiker}
            opProfiel={opProfiel}
            opUitteken={opUitteken}
          />
        )}
      </div>
    </div>
  );
}
