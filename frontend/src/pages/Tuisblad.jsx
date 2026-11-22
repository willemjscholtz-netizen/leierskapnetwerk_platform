import Uitleg from '../components/Uitleg';
import Kopbalk from '../components/Kopbalk';
import './Tuisblad.css';

/**
 * Die tuisblad.
 *
 * Kry die raamwerk met al drie die kolomme. Die sybalke is nog
 * leeg - die linkerkant kry later die navigasie en die regter-
 * kant die voorstelle. Die raamwerk staan egter al reg.
 */
export default function Tuisblad({ gebruiker, opProfiel, opUitteken }) {
  return (
    <Uitleg
      header={
        <Kopbalk
          gebruiker={gebruiker}
          opProfiel={opProfiel}
          opUitteken={opUitteken}
        />
      }
      links={
        <div className="sy-inhoud">
          <p className="sy-inhoud__titel">Navigasie</p>
          <p className="sy-inhoud__leeg">Kom binnekort</p>
        </div>
      }
      regs={
        <div className="sy-inhoud">
          <p className="sy-inhoud__titel">Voorstelle</p>
          <p className="sy-inhoud__leeg">Kom binnekort</p>
        </div>
      }
    >
      <div className="tuis__liggaam">
        <h1>Hallo{gebruiker?.first_name ? `, ${gebruiker.first_name}` : ''}</h1>
        <p className="tuis__teks">
          Jou profiel is volledig. Projekte en die maniere waarop jy
          betrokke kan raak, kom binnekort hier.
        </p>
      </div>
    </Uitleg>
  );
}
