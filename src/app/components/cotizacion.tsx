import React, { useState, useEffect } from 'react'
import AdminLayout from './adminLayout'
import html2pdf from 'html2pdf.js'

// Interfaces basadas en tus tipos
interface Plan {
    id: number;
    nombre: string;
    precio_mensual: number | string;
}

interface PlanTV {
    id: number;
    nombre: string;
    precio_mensual: number | string;
}

interface ClienteData {
    nombre: string;
    direccion: string;
    telefono: string;
}

interface CotizacionData {
    tipo: 'tv' | 'internet';
    cliente: ClienteData;
    plan: Plan | PlanTV;
    instalacion: number;
    subtotal: number;
    total: number;
    fecha: string;
}

interface PlanMap {
    [key: number]: Plan;
}

interface PlanTVMap {
    [key: number]: PlanTV;
}

const apiHost = process.env.NEXT_PUBLIC_API_HOST as string;

const Cotizacion = () => {
    const [showModal, setShowModal] = useState(false)
    const [modalType, setModalType] = useState<'tv' | 'internet'>('tv')
    const [planesTV, setPlanesTV] = useState<PlanTVMap>({})
    const [planesInternet, setPlanesInternet] = useState<PlanMap>({})
    const [loading, setLoading] = useState(false)
    const [cotizacionData, setCotizacionData] = useState<CotizacionData | null>(null)
    const [generandoPdf, setGenerandoPdf] = useState(false)

    // Datos del cliente
    const [clienteData, setClienteData] = useState<ClienteData>({
        nombre: '',
        direccion: '',
        telefono: ''
    })

    // Datos de la cotización
    const [cotizacionForm, setCotizacionForm] = useState({
        planSeleccionado: '',
        instalacion: 0
    })

    const formatCurrency = (value: number) =>
        value.toLocaleString('es-HN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        })

    // Cargar planes al abrir modal
    useEffect(() => {
        if (showModal) {
            cargarPlanes()
        }
    }, [showModal, modalType])

    const cargarPlanesInternet = async (): Promise<PlanMap> => {
        try {
            const resp = await fetch(`${apiHost}/api/planes`);
            if (!resp.ok) return {};
            const data: Plan[] = await resp.json();
            const mapa: PlanMap = {};
            data.forEach((p) => {
                mapa[p.id] = p;
            });
            setPlanesInternet(mapa);
            return mapa;
        } catch {
            return {};
        }
    }

    const cargarPlanesTV = async (): Promise<PlanTVMap> => {
        try {
            const resp = await fetch(`${apiHost}/api/tv/planes`);
            if (!resp.ok) return {};
            const data: PlanTV[] = await resp.json();
            const mapa: PlanTVMap = {};
            data.forEach((p) => {
                mapa[p.id] = p;
            });
            setPlanesTV(mapa);
            return mapa;
        } catch {
            return {};
        }
    }

    const cargarPlanes = async () => {
        setLoading(true)
        try {
            if (modalType === 'tv') {
                await cargarPlanesTV();
            } else if (modalType === 'internet') {
                await cargarPlanesInternet();
            }
        } catch (error) {
            console.error('Error cargando planes:', error)
        } finally {
            setLoading(false)
        }
    }

    const abrirModal = (tipo: 'tv' | 'internet') => {
        setModalType(tipo)
        setShowModal(true)
        setCotizacionData(null)
        // Resetear formularios
        setClienteData({ nombre: '', direccion: '', telefono: '' })
        setCotizacionForm({ planSeleccionado: '', instalacion: 0 })
    }

    const cerrarModal = () => {
        setShowModal(false)
    }

    const handleClienteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setClienteData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    const handleCotizacionChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setCotizacionForm(prev => ({
            ...prev,
            [name]: name === 'instalacion' ? parseFloat(value) || 0 : value
        }))
    }

    const generarCotizacion = () => {
        // Validaciones
        if (!clienteData.nombre.trim() || !clienteData.direccion.trim() || !clienteData.telefono.trim()) {
            alert('Por favor complete todos los datos del cliente')
            return
        }

        if (!cotizacionForm.planSeleccionado) {
            alert('Por favor seleccione un plan')
            return
        }

        const planId = parseInt(cotizacionForm.planSeleccionado)
        let planSeleccionado: Plan | PlanTV | undefined

        if (modalType === 'tv') {
            planSeleccionado = planesTV[planId]
        } else {
            planSeleccionado = planesInternet[planId]
        }

        if (!planSeleccionado) {
            alert('Plan seleccionado no válido')
            return
        }

        // Asegurar que trabajamos con números
        const precioMensual = Number(planSeleccionado.precio_mensual) || 0
        const instalacion = Number(cotizacionForm.instalacion) || 0

        const subtotal = precioMensual // Solo un mes
        const total = subtotal + instalacion

        const data: CotizacionData = {
            tipo: modalType,
            cliente: clienteData,
            plan: {
                ...planSeleccionado,
                precio_mensual: precioMensual
            },
            instalacion,
            subtotal,
            total,
            fecha: new Date().toLocaleDateString('es-HN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            })
        }

        setCotizacionData(data)
        cerrarModal()
    }

    const descargarPDF = async () => {
        if (!cotizacionData) return

        setGenerandoPdf(true)

        try {
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
                .cost-breakdown {
                    width: 100%;
                }
                .cost-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 8px;
                }
                .total-row {
                    border-top: 2px solid #333;
                    padding-top: 10px;
                    font-weight: bold;
                    font-size: 18px;
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
            </style>
        </head>
        <body>
            <div class="header">
                <img src="${window.location.origin}/img/conectapro.png"
                    alt="ConectaPro"
                    style="width: 140px; position: absolute; top: 20px; left: 20px;">

                <div style="margin-top: 40px;">
                    <div class="company-name">ON NET WIRELESS Y SERVICIOS</div>
                    <div>Cotización de Servicios</div>

                    <div class="service-type">
                        ${cotizacionData.tipo === 'tv'
                                ? 'Cotización de Servicios de IPTV'
                                : 'Cotización de Servicios de Internet'
                            }
                    </div>

                    <div class="date">Fecha: ${cotizacionData.fecha}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Datos del Cliente</div>
                <div class="client-data">
                    <div><strong>Nombre:</strong> ${cotizacionData.cliente.nombre}</div>
                    <div><strong>Teléfono:</strong> ${cotizacionData.cliente.telefono}</div>
                    <div style="grid-column: 1 / -1;"><strong>Dirección:</strong> ${cotizacionData.cliente.direccion}</div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Detalles del Servicio</div>
                <div class="cost-breakdown">
                    <div class="cost-row">
                        <strong>Plan:</strong>
                        <span>${cotizacionData.plan.nombre}</span>
                    </div>
                    <div class="cost-row">
                        <strong>Precio mensual:</strong>
                        <span>L. ${formatCurrency(cotizacionData.plan.precio_mensual as number)}</span>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Desglose de Costos</div>
                <div class="cost-breakdown">
                    <div class="cost-row">
                        <span>Servicio mensual:</span>
                        <span>L. ${formatCurrency(cotizacionData.subtotal)}</span>
                    </div>
                    ${cotizacionData.instalacion > 0 ? `
                        <div class="cost-row">
                            <span>Instalación:</span>
                            <span>L. ${formatCurrency(cotizacionData.instalacion)}</span>
                        </div>
                    ` : ''}
                    <div class="cost-row total-row">
                        <span>TOTAL:</span>
                        <span>L. ${formatCurrency(cotizacionData.total)}</span>
                    </div>
                </div>
            </div>

            <div class="footer">
                <img src="${window.location.origin}/img/ON-NET-BANNER.png"
                    alt="ON-NET Banner"
                    class="logo"
                    style="display: block; margin: 0 auto 10px; width: 200px;">
                <div>Gracias por considerar nuestros servicios. Esta cotización es válida por 15 días.</div>
            </div>
        </body>
        </html>
      `;

            const options = {
                margin: 10,
                filename: `cotizacion_${cotizacionData.tipo}_${cotizacionData.cliente.nombre.replace(/\s+/g, '_')}.pdf`,
                image: {
                    type: 'jpeg' as const,
                    quality: 0.98
                },
                html2canvas: {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                },
                jsPDF: {
                    unit: 'mm' as const,
                    format: 'a4' as const,
                    orientation: 'portrait' as const
                }
            }

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = htmlContent;
            document.body.appendChild(tempDiv);

            await html2pdf().set(options).from(tempDiv).save();

            document.body.removeChild(tempDiv);

        } catch (error) {
            console.error('Error generando PDF:', error)
            alert('Error al generar el PDF. Intente nuevamente.')
        } finally {
            setGenerandoPdf(false)
        }
    }

    const planesDisponibles = modalType === 'tv'
        ? Object.values(planesTV)
        : Object.values(planesInternet)

    return (
        <AdminLayout>
            <div className="px-4 sm:px-6 lg:px-8 py-16">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-12">
                        <h1 className="text-3xl font-bold text-orange-600 mb-4">Sistema de Cotizaciones</h1>
                        <p className="text-gray-600 text-lg">Seleccione el tipo de servicio a cotizar</p>
                    </div>

                    {/* Botones de selección */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                        <button
                            onClick={() => abrirModal('tv')}
                            className="bg-blue-600 hover:bg-blue-700 text-white py-8 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
                        >
                            <div className="text-2xl font-bold mb-2">TV</div>
                            <div className="text-sm opacity-90">Cotización de Servicios de IPTV</div>
                        </button>

                        <button
                            onClick={() => abrirModal('internet')}
                            className="bg-green-600 hover:bg-green-700 text-white py-8 px-6 rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105"
                        >
                            <div className="text-2xl font-bold mb-2">Internet</div>
                            <div className="text-sm opacity-90">Cotización de Servicios de Internet</div>
                        </button>
                    </div>

                    {/* Vista previa de cotización */}
                    {cotizacionData && (
                        <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8 border border-orange-200">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                        Vista Previa de Cotización
                                    </h2>
                                    <p className="text-green-600 font-semibold">
                                        Cotización de {cotizacionData.tipo === 'tv' ? 'TV' : 'Internet'} generada correctamente
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setCotizacionData(null)}
                                        className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg transition duration-300"
                                    >
                                        Nueva Cotización
                                    </button>
                                    <button
                                        onClick={descargarPDF}
                                        disabled={generandoPdf}
                                        className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg font-semibold transition duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {generandoPdf ? 'Generando PDF...' : 'Descargar PDF'}
                                    </button>
                                </div>
                            </div>

                            {/* Vista previa simple */}
                            <div className="bg-white p-8 border-2 border-gray-300 rounded-lg">
                                <div className="border-b-2 border-gray-300 pb-6 mb-6">
                                    <div className="text-center">
                                        <h1 className="text-3xl font-bold text-gray-800 mb-2">
                                            ON NET WIRELESS Y SERVICIOS
                                        </h1>
                                        <h2 className="text-xl text-gray-600 mb-3">
                                            Cotización de Servicios
                                        </h2>
                                        <h3 className="text-2xl font-semibold text-blue-600">
                                            {cotizacionData.tipo === 'tv'
                                                ? 'Cotización de Servicios de IPTV'
                                                : 'Cotización de Servicios de Internet'
                                            }
                                        </h3>
                                        <div className="text-lg text-gray-700 font-semibold mt-2">
                                            Fecha: {cotizacionData.fecha}
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                                        Datos del Cliente
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-lg">
                                        <div><strong>Nombre:</strong> {cotizacionData.cliente.nombre}</div>
                                        <div><strong>Teléfono:</strong> {cotizacionData.cliente.telefono}</div>
                                        <div className="md:col-span-2"><strong>Dirección:</strong> {cotizacionData.cliente.direccion}</div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                                        Detalles del Servicio
                                    </h3>
                                    <div className="space-y-3 text-lg">
                                        <div className="flex justify-between">
                                            <strong>Plan:</strong>
                                            <span>{cotizacionData.plan.nombre}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <strong>Precio mensual:</strong>
                                            <span>L. {formatCurrency(cotizacionData.plan.precio_mensual as number)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="mb-8">
                                    <h3 className="text-xl font-bold text-gray-800 mb-4 pb-2 border-b border-gray-200">
                                        Desglose de Costos
                                    </h3>
                                    <div className="space-y-3 text-lg">
                                        <div className="flex justify-between">
                                            <span>Servicio mensual:</span>
                                            <span>L. {formatCurrency(cotizacionData.subtotal)}</span>
                                        </div>
                                        {cotizacionData.instalacion > 0 && (
                                            <div className="flex justify-between">
                                                <span>Instalación:</span>
                                                <span>L. {formatCurrency(cotizacionData.instalacion)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between border-t-2 border-gray-300 pt-3 font-bold text-xl text-orange-600">
                                            <span>TOTAL:</span>
                                            <span>L. {formatCurrency(cotizacionData.total)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Modal de cotización */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center p-4 z-50">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                            <div className="p-8">
                                {/* Header del modal */}
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-3xl font-bold text-gray-800">
                                        {modalType === 'tv' ? 'Cotización TV' : 'Cotización Internet'}
                                    </h2>
                                    <button
                                        onClick={cerrarModal}
                                        className="text-gray-500 hover:text-gray-700 text-3xl transition duration-300"
                                    >
                                        ×
                                    </button>
                                </div>

                                {/* Datos del cliente */}
                                <div className="mb-8">
                                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                                        Datos del Cliente
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nombre completo *
                                            </label>
                                            <input
                                                type="text"
                                                name="nombre"
                                                value={clienteData.nombre}
                                                onChange={handleClienteChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300"
                                                placeholder="Ingrese nombre completo"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Teléfono *
                                            </label>
                                            <input
                                                type="tel"
                                                name="telefono"
                                                value={clienteData.telefono}
                                                onChange={handleClienteChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300"
                                                placeholder="Número de teléfono"
                                                required
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Dirección *
                                            </label>
                                            <input
                                                type="text"
                                                name="direccion"
                                                value={clienteData.direccion}
                                                onChange={handleClienteChange}
                                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300"
                                                placeholder="Dirección completa"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Selección de plan */}
                                <div className="mb-8">
                                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                                        Selección de Plan
                                    </h3>
                                    {loading ? (
                                        <div className="text-center py-4">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                                            <p className="text-gray-600 mt-2">Cargando planes...</p>
                                        </div>
                                    ) : (
                                        <select
                                            name="planSeleccionado"
                                            value={cotizacionForm.planSeleccionado}
                                            onChange={handleCotizacionChange}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300 text-lg"
                                        >
                                            <option value="">Seleccione un plan</option>
                                            {planesDisponibles.map(plan => (
                                                <option key={plan.id} value={plan.id}>
                                                    {plan.nombre} - L. {formatCurrency(Number(plan.precio_mensual) || 0)}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                {/* Instalación opcional */}
                                <div className="mb-8">
                                    <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
                                        Costos Adicionales
                                    </h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Instalación (L.) - Opcional
                                        </label>
                                        <input
                                            type="number"
                                            name="instalacion"
                                            value={cotizacionForm.instalacion}
                                            onChange={handleCotizacionChange}
                                            min="0"
                                            step="0.01"
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition duration-300"
                                            placeholder="0.00"
                                        />
                                        <p className="text-sm text-gray-500 mt-2">
                                            Deje en 0 si no aplica costo de instalación
                                        </p>
                                    </div>
                                </div>

                                {/* Botones */}
                                <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                                    <button
                                        onClick={cerrarModal}
                                        className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition duration-300 font-semibold"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={generarCotizacion}
                                        disabled={loading}
                                        className="px-8 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? 'Generando...' : 'Generar Cotización'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}

export default Cotizacion;
