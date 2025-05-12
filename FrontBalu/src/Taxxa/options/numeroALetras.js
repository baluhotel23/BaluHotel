function numeroALetras(num) {
    const unidades = [
      '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'
    ];
    const decenas = [
      '', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'
    ];
    const especiales = {
      11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
      16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve'
    };
    const centenas = [
      '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
      'seiscientos', 'setecientos', 'ochocientos', 'novecientos'
    ];
  
    const millares = 'mil';
    const millones = 'millón';
    const millonesPlural = 'millones';
  
    if (num === 0) return 'cero';
    if (num === 100) return 'cien';
  
    let letras = '';
  
    // Función auxiliar para cientos, decenas y unidades
    function convertirCentenas(n) {
      let result = '';
  
      // Centenas
      if (n >= 100) {
        const c = Math.floor(n / 100);
        result += `${centenas[c]} `;
        n %= 100;
      }
  
      // Decenas especiales
      if (n >= 10 && n <= 19) {
        result += `${especiales[n]} `;
        n = 0;
      } else if (n >= 10) {
        const d = Math.floor(n / 10);
        result += `${decenas[d]} `;
        n %= 10;
      }
  
      // Unidades
      if (n > 0) {
        result += unidades[n];
      }
  
      return result.trim();
    }
  
    // Millones
    if (num >= 1_000_000) {
      const m = Math.floor(num / 1_000_000);
      letras += `${convertirCentenas(m)} ${m > 1 ? millonesPlural : millones} `;
      num %= 1_000_000;
    }
  
    // Miles
    if (num >= 1_000) {
      const mil = Math.floor(num / 1_000);
      letras += mil === 1 ? `${millares} ` : `${convertirCentenas(mil)} ${millares} `;
      num %= 1_000;
    }
  
    // Centenas, decenas y unidades
    if (num > 0) {
      letras += convertirCentenas(num);
    }
  
    return letras.trim();
  }
  
  function numeroALetrasConDecimales(num) {
    const [entero, decimal] = num.toString().split('.');
  
    const parteEntera = numeroALetras(Number(entero));
    const parteDecimal = decimal ? numeroALetras(Number(decimal)) : null;
  
    if (parteDecimal) {
      return `${parteEntera} con ${parteDecimal} centavos`;
    }
    return parteEntera;
  }
  
  export default numeroALetrasConDecimales;
  