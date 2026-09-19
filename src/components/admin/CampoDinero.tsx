"use client";

/**
 * CAMPO DE DINERO — formato colombiano mientras se escribe
 * ========================================================
 * Un `<input type="number">` no puede mostrar separadores de miles y, además,
 * manda «9115.08» con punto DECIMAL, que es justo lo que causó el bug de las
 * tarifas multiplicadas por cien. Este campo es un texto con
 * `inputMode="decimal"` (o `"numeric"` si no admite decimales) que:
 *
 *  · pone los puntos de miles solo, mientras se escribe: «1300000» se ve
 *    «1.300.000»;
 *  · usa la COMA para los decimales («9.115,08») y no deja escribir más
 *    decimales de los permitidos;
 *  · mantiene el cursor en su sitio: cuenta las cifras que había a su izquierda
 *    y lo deja después de esas mismas cifras (`reformatearEntrada`, probada en
 *    `scripts/pruebas-nomina.mjs`);
 *  · al borrar con ← sobre un punto de miles, borra la cifra de al lado en vez
 *    de quedarse atascado en el punto;
 *  · al PEGAR, lee lo pegado con `parsearNumero` —la misma regla que el
 *    servidor—, así que «9.115,08», «$ 1.300.000», «9115.08» o «1,300,000.50»
 *    quedan bien;
 *  · y manda al servidor, en un `<input type="hidden">` con el `name`, el valor
 *    LIMPIO («1300000», «9115.08»). El servidor lo vuelve a leer con
 *    `parsearNumero`, así que nunca hay dos reglas distintas.
 *
 * EL PUNTO QUE SE TECLEA A MANO
 * -----------------------------
 * En formato colombiano el punto es de miles, y el campo ya los pone solo: un
 * punto tecleado a mano se ignora (quien escribe «1.300.000» con sus puntos ve
 * exactamente eso). La excepción es un campo CON decimales (las tarifas) cuando
 * el punto se teclea AL FINAL de una cifra de cuatro dígitos o más: ahí nadie
 * está escribiendo miles (el campo ya los puso), sino el decimal del teclado
 * numérico —«9115.08»—, y se convierte en coma. Sin esa excepción, quien teclea
 * «9115.08» vería «911.508»: el mismo bug de antes, ahora a la vista.
 *
 * Solo importa de `ui-base` (nunca de `ui.tsx`): ver la nota de ese archivo.
 */

import { useLayoutEffect, useReducer, useRef, useState } from "react";
import { inputClass } from "@/components/admin/ui-base";
import {
  parsearNumero,
  reformatearEntrada,
  textoDeEntrada,
  valorLimpio,
} from "@/lib/dinero";

export interface CampoDineroProps {
  id: string;
  /** Nombre con el que viaja el valor LIMPIO en el formulario. */
  name: string;
  /**
   * Modo controlado: el número que manda el padre. Si cambia desde fuera (p.
   * ej. «Usar los valores sugeridos»), el texto del campo se actualiza.
   */
  valor?: number;
  /** Modo libre: el número con el que arranca el campo. */
  valorInicial?: number | null;
  /** Se llama con el número (0 si está vacío) cada vez que cambia. */
  onCambio?: (valor: number) => void;
  /** Cuántos decimales se dejan escribir: 0 = pesos enteros; 2 = tarifas. */
  decimales?: 0 | 2;
  /** false = sin puntos de miles (porcentajes). */
  miles?: boolean;
  /** Símbolo a la izquierda («$»). */
  prefijo?: string;
  /** Símbolo a la derecha («%»). */
  sufijo?: string;
  /** true (por defecto) = un 0 se muestra como campo vacío. */
  vacioSiCero?: boolean;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-label"?: string;
}

export function CampoDinero({
  id,
  name,
  valor,
  valorInicial,
  onCambio,
  decimales = 0,
  miles = true,
  prefijo,
  sufijo,
  vacioSiCero = true,
  required,
  placeholder,
  disabled,
  className = "",
  "aria-describedby": describedBy,
  "aria-label": ariaLabel,
}: CampoDineroProps) {
  const opcionesTexto = { decimales, miles, vacioSiCero };
  const [texto, setTexto] = useState(() =>
    textoDeEntrada(valor ?? valorInicial ?? null, opcionesTexto),
  );

  // Sincronización con el padre en modo controlado. Es el patrón «ajustar el
  // estado durante el render» de React: solo reescribe el texto cuando el
  // número del padre ya no es el que el campo muestra (un cambio que vino de
  // fuera, no de lo que se está tecleando).
  const [valorVisto, setValorVisto] = useState(valor);
  if (valor !== undefined && valor !== valorVisto) {
    setValorVisto(valor);
    if ((parsearNumero(texto) ?? 0) !== valor) {
      setTexto(textoDeEntrada(valor, opcionesTexto));
    }
  }

  const ref = useRef<HTMLInputElement>(null);
  const cursorPendiente = useRef<number | null>(null);
  // Cuando el texto reformateado es idéntico al anterior (se tecleó algo que
  // no vale, como una letra), React no vuelve a pintar y el cursor saltaría al
  // final: esta marca fuerza el efecto que lo recoloca.
  const [marca, forzar] = useReducer((n: number) => n + 1, 0);

  useLayoutEffect(() => {
    const posicion = cursorPendiente.current;
    const campo = ref.current;
    if (posicion === null || !campo) return;
    cursorPendiente.current = null;
    if (document.activeElement === campo) campo.setSelectionRange(posicion, posicion);
  }, [texto, marca]);

  const aplicar = (bruto: string, cursor: number) => {
    const r = reformatearEntrada(bruto, cursor, { decimales, miles });
    cursorPendiente.current = r.cursor;
    if (r.texto === texto) forzar();
    else setTexto(r.texto);
    onCambio?.(parsearNumero(r.texto) ?? 0);
  };

  return (
    <div className={`relative ${className}`}>
      {prefijo && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-sm text-graphite"
        >
          {prefijo}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode={decimales > 0 ? "decimal" : "numeric"}
        autoComplete="off"
        spellCheck={false}
        value={texto}
        required={required}
        disabled={disabled}
        placeholder={placeholder ?? (decimales > 0 ? "0,00" : "0")}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        className={`${inputClass} tabular-nums ${prefijo ? "pl-8" : ""} ${sufijo ? "pr-9" : ""}`}
        onChange={(e) => {
          let bruto = e.target.value;
          const cursor = e.target.selectionStart ?? bruto.length;

          // El punto del teclado numérico (ver la cabecera): solo en campos con
          // decimales, tecleado al final y detrás de 4 cifras o más.
          if (
            decimales > 0 &&
            miles &&
            !texto.includes(",") &&
            bruto.length === texto.length + 1 &&
            cursor === bruto.length &&
            bruto.endsWith(".") &&
            (bruto.match(/\d/g) ?? []).length >= 4
          ) {
            bruto = `${bruto.slice(0, -1)},`;
          }

          aplicar(bruto, cursor);
        }}
        onKeyDown={(e) => {
          // Borrar sobre un punto de miles borra la cifra de al lado.
          if (!miles) return;
          const campo = e.currentTarget;
          const inicio = campo.selectionStart ?? 0;
          const fin = campo.selectionEnd ?? 0;
          if (inicio !== fin) return;
          if (e.key === "Backspace" && inicio > 0 && texto[inicio - 1] === ".") {
            campo.setSelectionRange(inicio - 1, inicio - 1);
          } else if (e.key === "Delete" && texto[inicio] === ".") {
            campo.setSelectionRange(inicio + 1, inicio + 1);
          }
        }}
        onPaste={(e) => {
          const pegado = e.clipboardData.getData("text");
          const n = parsearNumero(pegado);
          // Si no es un número, se deja pasar: el formato quitará lo que sobre.
          if (n === null) return;
          e.preventDefault();
          const campo = e.currentTarget;
          const inicio = campo.selectionStart ?? texto.length;
          const fin = campo.selectionEnd ?? texto.length;
          const insertado = textoDeEntrada(Math.abs(n), {
            decimales,
            miles,
            vacioSiCero: false,
          });
          const todo = texto === "" || (inicio === 0 && fin === texto.length);
          if (todo) aplicar(insertado, insertado.length);
          else
            aplicar(
              texto.slice(0, inicio) + insertado + texto.slice(fin),
              inicio + insertado.length,
            );
        }}
        onBlur={() => {
          // Al salir se deja el formato final: sin coma colgando y, en las
          // tarifas, con dos decimales si los hay («9.115,5» → «9.115,50»).
          const n = parsearNumero(texto);
          const final = n === null ? "" : textoDeEntrada(n, { ...opcionesTexto, vacioSiCero: false });
          if (final !== texto) setTexto(final);
        }}
      />
      {sufijo && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-sm text-graphite"
        >
          {sufijo}
        </span>
      )}
      <input type="hidden" name={name} value={valorLimpio(texto)} />
    </div>
  );
}
