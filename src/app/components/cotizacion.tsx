"use client";

import React, { useState } from "react";
import AdminLayout from "./adminLayout";
import html2pdf from "html2pdf.js";

interface ClienteData {
    nombre: string;
    direccion: string;
    telefono: string;
    rtn: string; // opcional en comportamiento (si vacío no se muestra)
}

interface CotizacionItem {
    id: number;
    concepto: string;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;  // precio final con ISV
    precioSinISV: number;    // calculado automáticamente
}

interface CotizacionData {
    cliente: ClienteData;
    items: CotizacionItem[];
    total: number; // total con ISV
    fecha: string;
}

const Cotizacion = () => {
    const [clienteData, setClienteData] = useState<ClienteData>({
        nombre: "",
        direccion: "",
        telefono: "",
        rtn: "",
    });

    const [items, setItems] = useState<CotizacionItem[]>([]);
    const [itemForm, setItemForm] = useState({
        concepto: "",
        descripcion: "",
        cantidad: "",
        precioUnitario: "",
    });

    const [cotizacionData, setCotizacionData] = useState<CotizacionData | null>(
        null
    );
    const [generandoPdf, setGenerandoPdf] = useState(false);

    const formatCurrency = (value: number) =>
        value.toLocaleString("es-HN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });

    // Total general (precio con ISV)
    const total = items.reduce(
        (acc, item) => acc + item.cantidad * item.precioUnitario,
        0
    );
    const isv = total * 0.15;
    const subtotal = total - isv;

    /* ====== Handlers ====== */

    const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setClienteData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleItemChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setItemForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const agregarItem = () => {
        const concepto = itemForm.concepto.trim();
        const descripcion = itemForm.descripcion.trim();
        const cantidadNum = parseFloat(itemForm.cantidad);
        const precioNum = parseFloat(itemForm.precioUnitario);

        if (!concepto) {
            alert("Ingrese un concepto para el artículo.");
            return;
        }

        if (isNaN(cantidadNum) || cantidadNum <= 0) {
            alert("Ingrese una cantidad válida mayor que 0.");
            return;
        }

        if (isNaN(precioNum) || precioNum <= 0) {
            alert("Ingrese un precio unitario válido mayor que 0.");
            return;
        }

        // El precio que ingresa el usuario YA incluye ISV
        const precioSinISV = precioNum / 1.15;

        const nuevoItem: CotizacionItem = {
            id: Date.now(),
            concepto,
            descripcion,
            cantidad: cantidadNum,
            precioUnitario: precioNum, // con ISV
            precioSinISV,              // sin ISV (calculado)
        };

        setItems((prev) => [...prev, nuevoItem]);
        setItemForm({
            concepto: "",
            descripcion: "",
            cantidad: "",
            precioUnitario: "",
        });
    };

    const eliminarItem = (id: number) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const generarCotizacion = () => {
        if (
            !clienteData.nombre.trim() ||
            !clienteData.direccion.trim() ||
            !clienteData.telefono.trim()
        ) {
            alert("Complete todos los datos del cliente.");
            return;
        }

        if (items.length === 0) {
            alert("Agregue al menos un artículo a la cotización.");
            return;
        }

        const data: CotizacionData = {
            cliente: { ...clienteData },
            items: [...items],
            total,
            fecha: new Date().toLocaleDateString("es-HN", {
                year: "numeric",
                month: "long",
                day: "numeric",
            }),
        };

        setCotizacionData(data);
    };

    const nuevaCotizacion = () => {
        setClienteData({
            nombre: "",
            direccion: "",
            telefono: "",
            rtn: "",
        });
        setItems([]);
        setItemForm({
            concepto: "",
            descripcion: "",
            cantidad: "",
            precioUnitario: "",
        });
        setCotizacionData(null);
    };

    const descargarPDF = async () => {
        if (!cotizacionData) return;

        setGenerandoPdf(true);

        try {
            const filasItems = cotizacionData.items
                .map((item, index) => {
                    const totalLinea = item.cantidad * item.precioUnitario;
                    return `
          <tr>
            <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: center;">
              ${index + 1}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #ccc;">
              ${item.concepto}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #ccc;">
              ${item.descripcion || ""}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: center;">
              ${item.cantidad}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: right;">
              L. ${formatCurrency(item.precioSinISV)}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: right;">
              L. ${formatCurrency(item.precioUnitario)}
            </td>
            <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: right;">
              L. ${formatCurrency(totalLinea)}
            </td>
          </tr>
        `;
                })
                .join("");

            const totalPDF = cotizacionData.total;
            const isvPDF = totalPDF * 0.15;
            const subtotalPDF = totalPDF - isvPDF;

            const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              position: relative;
              padding-top: 30px;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 10px;
            }
            .service-type {
              font-size: 20px;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .date {
              font-size: 16px;
              margin-bottom: 10px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 10px;
              border-bottom: 1px solid #ccc;
              padding-bottom: 5px;
            }
            .client-data {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              border-top: 2px solid #333;
              padding-top: 20px;
              font-size: 12px;
              color: #666;
            }
            .logo {
              max-width: 150px;
              margin: 0 auto 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #f3f3f3;
            }
            th, td {
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="${window.location.origin}/img/conectaprobg.png"
              alt="ConectaPro"
              style="width: 180px; position: absolute; top: 20px; left: 20px;">

            <div style="margin-top: 40px;">
              <div class="company-name">ON NET WIRELESS Y SERVICIOS</div>
              <div class="service-type">Cotización de servicios</div>
              <div class="date">Fecha: ${cotizacionData.fecha}</div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Datos del Cliente</div>
            <div class="client-data">
              <div><strong>Nombre:</strong> ${cotizacionData.cliente.nombre}</div>
              ${
                  cotizacionData.cliente.rtn &&
                  cotizacionData.cliente.rtn.trim() !== ""
                      ? `<div><strong>RTN:</strong> ${cotizacionData.cliente.rtn}</div>`
                      : ""
              }
              <div><strong>Teléfono:</strong> ${cotizacionData.cliente.telefono}</div>
              <div style="grid-column: 1 / -1;">
                <strong>Dirección:</strong> ${cotizacionData.cliente.direccion}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Detalle de la Cotización</div>
            <table>
              <thead>
                <tr>
                  <th style="padding: 6px 8px; border: 1px solid #ccc; width: 40px;">#</th>
                  <th style="padding: 6px 8px; border: 1px solid #ccc;">Concepto</th>
                  <th style="padding: 6px 8px; border: 1px solid #ccc;">Descripción</th>
                  <th style="padding: 6px 8px; border: 1px solid #ccc; width: 70px;">Cant.</th>
                  <th style="padding: 6px 8px; border: 1px solid #ccc; width: 120px;">Precio sin ISV (L.)</th>
                  <th style="padding: 6px 8px; border: 1px solid #ccc; width: 120px;">Precio unitario (L.)</th>
                  <th style="padding: 6px 8px; border: 1px solid #ccc; width: 120px;">Total (L.)</th>
                </tr>
              </thead>
              <tbody>
                ${filasItems}
                <tr>
                  <td colspan="6" style="padding: 6px 8px; border: 1px solid #ccc; text-align: right;">
                    Subtotal
                  </td>
                  <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: right;">
                    L. ${formatCurrency(subtotalPDF)}
                  </td>
                </tr>
                <tr>
                  <td colspan="6" style="padding: 6px 8px; border: 1px solid #ccc; text-align: right;">
                    ISV (15%)
                  </td>
                  <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: right;">
                    L. ${formatCurrency(isvPDF)}
                  </td>
                </tr>
                <tr>
                  <td colspan="6" style="padding: 6px 8px; border: 1px solid #ccc; text-align: right; font-weight: bold;">
                    TOTAL
                  </td>
                  <td style="padding: 6px 8px; border: 1px solid #ccc; text-align: right; font-weight: bold;">
                    L. ${formatCurrency(totalPDF)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="footer">
                <img 
                src="${window.location.origin}/img/ON-NET-BANNER.png"
                alt="ON-NET Banner"
                class="logo"
                style="
                    display: block;
                    margin: 0 auto 25px;
                    width: 40%;
                    max-width: 900px;
                    padding: 0 20px;
                "
                >
                <div>Gracias por considerar nuestros servicios. Esta cotización es válida por 15 días.</div>
            </div>
        </html>
      `;

            const options = {
                margin: 10,
                filename: `cotizacion_${cotizacionData.cliente.nombre.replace(
                    /\s+/g,
                    "_"
                )}.pdf`,
                image: {
                    type: "jpeg" as const,
                    quality: 0.98,
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: "#ffffff",
                },
                jsPDF: {
                    unit: "mm" as const,
                    format: "a4" as const,
                    orientation: "portrait" as const,
                },
            };

            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = htmlContent;
            document.body.appendChild(tempDiv);

            await html2pdf().set(options).from(tempDiv).save();

            document.body.removeChild(tempDiv);
        } catch (error) {
            console.error("Error generando PDF:", error);
            alert("Error al generar el PDF. Intente nuevamente.");
        } finally {
            setGenerandoPdf(false);
        }
    };

    const clienteIncompleto =
        !clienteData.nombre.trim() ||
        !clienteData.direccion.trim() ||
        !clienteData.telefono.trim();

    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8 py-16">
                <div className="max-w-5xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-bold text-orange-600 mb-3">
                            Sistema de Cotizaciones
                        </h1>
                        <p className="text-gray-600 text-lg">
                            Complete los datos del cliente y agregue los artículos a cotizar
                        </p>
                    </div>

                    {/* Formulario principal */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                        {/* Datos del cliente */}
                        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                                Datos del Cliente
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Nombre completo *
                                    </label>
                                    <input
                                        type="text"
                                        name="nombre"
                                        value={clienteData.nombre}
                                        onChange={handleClienteChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Ingrese nombre completo"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Teléfono *
                                    </label>
                                    <input
                                        type="tel"
                                        name="telefono"
                                        value={clienteData.telefono}
                                        onChange={handleClienteChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Número de teléfono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Dirección *
                                    </label>
                                    <input
                                        type="text"
                                        name="direccion"
                                        value={clienteData.direccion}
                                        onChange={handleClienteChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Dirección completa"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        RTN
                                    </label>
                                    <input
                                        type="text"
                                        name="rtn"
                                        value={clienteData.rtn}
                                        onChange={handleClienteChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="RTN del cliente (opcional)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Formulario de artículo */}
                        <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                                Agregar artículo
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Concepto *
                                    </label>
                                    <input
                                        type="text"
                                        name="concepto"
                                        value={itemForm.concepto}
                                        onChange={handleItemChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Ej: Instalación de cámaras"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Descripción
                                    </label>
                                    <textarea
                                        name="descripcion"
                                        value={itemForm.descripcion}
                                        onChange={handleItemChange}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 min-h-[80px]"
                                        placeholder="Detalles opcionales del servicio o producto"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Cantidad *
                                        </label>
                                        <input
                                            type="number"
                                            name="cantidad"
                                            value={itemForm.cantidad}
                                            onChange={handleItemChange}
                                            min="1"
                                            step="1"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Precio unitario (L.) *
                                        </label>
                                        <input
                                            type="number"
                                            name="precioUnitario"
                                            value={itemForm.precioUnitario}
                                            onChange={handleItemChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button
                                        type="button"
                                        onClick={agregarItem}
                                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                                    >
                                        Agregar artículo
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Lista de items */}
                    <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100 mb-10">
                        <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                            Artículos de la cotización
                        </h2>

                        {items.length === 0 ? (
                            <p className="text-gray-500">
                                Aún no ha agregado ningún artículo. Use el formulario de la
                                derecha para agregar el primero.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="bg-gray-100 text-gray-700">
                                            <th className="px-3 py-2 text-left w-10">#</th>
                                            <th className="px-3 py-2 text-left">Concepto</th>
                                            <th className="px-3 py-2 text-left">Descripción</th>
                                            <th className="px-3 py-2 text-center w-20">Cant.</th>
                                            <th className="px-3 py-2 text-right w-32">
                                                Precio sin ISV (L.)
                                            </th>
                                            <th className="px-3 py-2 text-right w-32">
                                                Precio unitario (L.)
                                            </th>
                                            <th className="px-3 py-2 text-right w-32">Total (L.)</th>
                                            <th className="px-3 py-2 text-center w-16">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => {
                                            const totalLinea = item.cantidad * item.precioUnitario;
                                            return (
                                                <tr
                                                    key={item.id}
                                                    className={
                                                        index % 2 === 0 ? "bg-white" : "bg-gray-50"
                                                    }
                                                >
                                                    <td className="px-3 py-2 align-top">{index + 1}</td>
                                                    <td className="px-3 py-2 align-top font-medium">
                                                        {item.concepto}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-gray-700">
                                                        {item.descripcion}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-center">
                                                        {item.cantidad}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-right">
                                                        L. {formatCurrency(item.precioSinISV)}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-right">
                                                        L. {formatCurrency(item.precioUnitario)}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-right">
                                                        L. {formatCurrency(totalLinea)}
                                                    </td>
                                                    <td className="px-3 py-2 align-top text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => eliminarItem(item.id)}
                                                            className="text-red-600 hover:text-red-800 text-sm font-semibold"
                                                        >
                                                            Eliminar
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-2 text-right font-semibold text-gray-800"
                                            >
                                                Subtotal
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-800">
                                                L. {formatCurrency(subtotal)}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="px-3 py-2 text-right font-semibold text-gray-800"
                                            >
                                                ISV (15%)
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-800">
                                                L. {formatCurrency(isv)}
                                            </td>
                                        </tr>
                                        <tr className="border-t">
                                            <td
                                                colSpan={7}
                                                className="px-3 py-3 text-right font-bold text-gray-800"
                                            >
                                                TOTAL
                                            </td>
                                            <td className="px-3 py-3 text-right font-bold text-orange-600">
                                                L. {formatCurrency(total)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Botón generar cotización */}
                    <div className="flex justify-between items-center mb-10">
                        <button
                            type="button"
                            onClick={nuevaCotizacion}
                            className="px-5 py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-semibold"
                        >
                            Limpiar formulario
                        </button>
                        <button
                            type="button"
                            onClick={generarCotizacion}
                            disabled={clienteIncompleto || items.length === 0}
                            className="px-8 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Generar vista previa de cotización
                        </button>
                    </div>

                    {/* Vista previa y descarga PDF */}
                    {cotizacionData &&
                        (() => {
                            const totalPrev = cotizacionData.total;
                            const isvPrev = totalPrev * 0.15;
                            const subtotalPrev = totalPrev - isvPrev;

                            return (
                                <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 border border-orange-200">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-800 mb-1">
                                                Vista previa de cotización
                                            </h2>
                                            <p className="text-gray-600">
                                                Revise los datos antes de descargar el PDF.
                                            </p>
                                        </div>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setCotizacionData(null)}
                                                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition"
                                            >
                                                Seguir editando
                                            </button>
                                            <button
                                                type="button"
                                                onClick={descargarPDF}
                                                disabled={generandoPdf}
                                                className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {generandoPdf ? "Generando PDF..." : "Descargar PDF"}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-white p-6 border-2 border-gray-300 rounded-lg">
                                        <div className="border-b-2 border-gray-300 pb-4 mb-4">
                                            <div className="text-center">
                                                <h1 className="text-2xl font-bold text-gray-800 mb-1">
                                                    ON NET WIRELESS Y SERVICIOS
                                                </h1>
                                                <h2 className="text-lg text-gray-600 mb-1">
                                                    Cotización de servicios
                                                </h2>
                                                <div className="text-md text-gray-700 font-semibold mt-1">
                                                    Fecha: {cotizacionData.fecha}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mb-6">
                                            <h3 className="text-lg font-bold text-gray-800 mb-3 pb-1 border-b border-gray-200">
                                                Datos del Cliente
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-md">
                                                <div>
                                                    <strong>Nombre:</strong>{" "}
                                                    {cotizacionData.cliente.nombre}
                                                </div>
                                                {cotizacionData.cliente.rtn &&
                                                    cotizacionData.cliente.rtn.trim() !== "" && (
                                                        <div>
                                                            <strong>RTN:</strong>{" "}
                                                            {cotizacionData.cliente.rtn}
                                                        </div>
                                                    )}
                                                <div>
                                                    <strong>Teléfono:</strong>{" "}
                                                    {cotizacionData.cliente.telefono}
                                                </div>
                                                <div className="md:col-span-2">
                                                    <strong>Dirección:</strong>{" "}
                                                    {cotizacionData.cliente.direccion}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-bold text-gray-800 mb-3 pb-1 border-b border-gray-200">
                                                Detalle de la cotización
                                            </h3>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-100 text-gray-700">
                                                            <th className="px-3 py-2 text-left w-10">#</th>
                                                            <th className="px-3 py-2 text-left">Concepto</th>
                                                            <th className="px-3 py-2 text-left">
                                                                Descripción
                                                            </th>
                                                            <th className="px-3 py-2 text-center w-20">
                                                                Cant.
                                                            </th>
                                                            <th className="px-3 py-2 text-right w-32">
                                                                Precio sin ISV (L.)
                                                            </th>
                                                            <th className="px-3 py-2 text-right w-32">
                                                                Precio unitario (L.)
                                                            </th>
                                                            <th className="px-3 py-2 text-right w-32">
                                                                Total (L.)
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {cotizacionData.items.map((item, index) => {
                                                            const totalLinea =
                                                                item.cantidad * item.precioUnitario;
                                                            return (
                                                                <tr
                                                                    key={item.id}
                                                                    className={
                                                                        index % 2 === 0
                                                                            ? "bg-white"
                                                                            : "bg-gray-50"
                                                                    }
                                                                >
                                                                    <td className="px-3 py-2 align-top">
                                                                        {index + 1}
                                                                    </td>
                                                                    <td className="px-3 py-2 align-top font-medium">
                                                                        {item.concepto}
                                                                    </td>
                                                                    <td className="px-3 py-2 align-top text-gray-700">
                                                                        {item.descripcion}
                                                                    </td>
                                                                    <td className="px-3 py-2 align-top text-center">
                                                                        {item.cantidad}
                                                                    </td>
                                                                    <td className="px-3 py-2 align-top text-right">
                                                                        L.{" "}
                                                                        {formatCurrency(
                                                                            item.precioSinISV
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2 align-top text-right">
                                                                        L.{" "}
                                                                        {formatCurrency(
                                                                            item.precioUnitario
                                                                        )}
                                                                    </td>
                                                                    <td className="px-3 py-2 align-top text-right">
                                                                        L. {formatCurrency(totalLinea)}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                    <tfoot>
                                                        <tr>
                                                            <td
                                                                colSpan={6}
                                                                className="px-3 py-2 text-right font-semibold text-gray-800"
                                                            >
                                                                Subtotal
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-gray-800">
                                                                L. {formatCurrency(subtotalPrev)}
                                                            </td>
                                                        </tr>
                                                        <tr>
                                                            <td
                                                                colSpan={6}
                                                                className="px-3 py-2 text-right font-semibold text-gray-800"
                                                            >
                                                                ISV (15%)
                                                            </td>
                                                            <td className="px-3 py-2 text-right text-gray-800">
                                                                L. {formatCurrency(isvPrev)}
                                                            </td>
                                                        </tr>
                                                        <tr className="border-t">
                                                            <td
                                                                colSpan={6}
                                                                className="px-3 py-3 text-right font-bold text-gray-800"
                                                            >
                                                                TOTAL
                                                            </td>
                                                            <td className="px-3 py-3 text-right font-bold text-orange-600">
                                                                L. {formatCurrency(totalPrev)}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                </div>
            </div>
        </AdminLayout>
    );
};

export default Cotizacion;
