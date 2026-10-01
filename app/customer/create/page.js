'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import LocationPicker from '../../../components/customer/LocationPicker'

const RED = '#ed1c24'

const deliveryTypes = [
    {
        name: 'Food',
        icon: '🍴',
    },
    {
        name: 'Groceries',
        icon: '🛒',
    },
    {
        name: 'Documents',
        icon: '▤',
    },
    {
        name: 'Parcel',
        icon: '◇',
    },
    {
        name: 'Other',
        icon: '□',
    },
]

export default function CreateDeliveryPage() {
    const router = useRouter()

    const [step, setStep] = useState(1)

    const [form, setForm] = useState({
        pickup: null,
        destination: null,
        deliveryType: '',
        packageDetails: '',
        recipientName: '',
        recipientPhone: '',
    })

    const [error, setError] = useState('')

    function updateField(field, value) {
        setForm((current) => ({
            ...current,
            [field]: value,
        }))

        setError('')
    }

    function goBack() {
        if (step === 1) {
            router.push('/customer')
            return
        }

        setStep((current) => current - 1)
        setError('')
    }

    function continueStep() {
        setError('')

        if (step === 1) {
            if (!form.pickup?.lat || !form.pickup?.lng) {
                setError('Please select a pickup location.')
                return
            }

            setStep(2)
            return
        }

        if (step === 2) {
            if (
                !form.destination?.lat ||
                !form.destination?.lng
            ) {
                setError('Please select a destination.')
                return
            }

            setStep(3)
            return
        }

        if (step === 3) {
            if (!form.deliveryType) {
                setError('Please select what you are delivering.')
                return
            }

            setStep(4)
            return
        }

        if (step === 4) {
            if (!form.packageDetails.trim()) {
                setError('Please describe the package.')
                return
            }

            if (!form.recipientName.trim()) {
                setError('Please enter the recipient name.')
                return
            }

            if (!form.recipientPhone.trim()) {
                setError('Please enter the recipient phone number.')
                return
            }

            sessionStorage.setItem(
                'kwiQueDeliveryDraft',
                JSON.stringify(form)
            )

            router.push('/customer/create/review')
        }
    }

    const stepData = {
        1: {
            title: 'Where are we picking it up?',
            description:
                'Choose a precise spot so your rider finds it quickly.',
        },
        2: {
            title: 'Where should we deliver it?',
            description:
                'Choose a precise spot so your rider finds it quickly.',
        },
        3: {
            title: 'What are we delivering?',
            description:
                'Select the option that best fits your item.',
        },
        4: {
            title: 'Delivery details',
            description:
                'A few details help your rider complete the delivery smoothly.',
        },
    }

    return (
        <main className="min-h-screen bg-[#fff3f0] px-4 py-5 sm:px-6">
            <div className="mx-auto w-full max-w-xl">

                {/* Header */}
                <header className="mb-5 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => router.push('/customer')}
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-sm transition hover:scale-105"
                    >
                        <span className="text-xl">←</span>
                    </button>

                    <div className="text-center">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#8b6259]">
                            Step {step} of 5
                        </p>
                    </div>

                    <div className="h-11 w-11" />
                </header>

                {/* Progress */}
                <div className="mb-5 flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((item) => (
                        <div
                            key={item}
                            className="h-1.5 flex-1 rounded-full transition-all"
                            style={{
                                backgroundColor:
                                    item <= step
                                        ? RED
                                        : '#f4cbc5',
                            }}
                        />
                    ))}
                </div>

                {/* Main card */}
                <section className="overflow-hidden rounded-[30px] bg-[#fffdfc] shadow-[0_15px_50px_rgba(100,30,20,0.08)]">

                    {/* Content */}
                    <div className="px-6 pb-7 pt-7 sm:px-8">

                        {/* Step heading */}
                        <div className="mb-7">
                            <h1 className="max-w-md text-[34px] font-black leading-[1.05] tracking-[-1.5px] text-[#351b18]">
                                {stepData[step]?.title}
                            </h1>

                            <p className="mt-3 max-w-md text-[16px] leading-6 text-[#8b6259]">
                                {stepData[step]?.description}
                            </p>
                        </div>

                        {/* STEP 1 */}
                        {step === 1 && (
                            <div>
                                <LocationPicker
                                    label="Pickup location"
                                    value={form.pickup}
                                    onChange={(value) =>
                                        updateField(
                                            'pickup',
                                            value
                                        )
                                    }
                                />

                                <button
                                    type="button"
                                    className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-[#eadedb] bg-white px-5 py-3.5 text-sm font-semibold text-[#351b18] shadow-sm transition hover:bg-[#fff8f6]"
                                >
                                    <span>⊙</span>
                                    Use current location
                                </button>
                            </div>
                        )}

                        {/* STEP 2 */}
                        {step === 2 && (
                            <LocationPicker
                                label="Destination address"
                                value={form.destination}
                                onChange={(value) =>
                                    updateField(
                                        'destination',
                                        value
                                    )
                                }
                            />
                        )}

                        {/* STEP 3 */}
                        {step === 3 && (
                            <div className="grid grid-cols-2 gap-3">

                                {deliveryTypes.map((type) => {
                                    const selected =
                                        form.deliveryType ===
                                        type.name

                                    return (
                                        <button
                                            key={type.name}
                                            type="button"
                                            onClick={() =>
                                                updateField(
                                                    'deliveryType',
                                                    type.name
                                                )
                                            }
                                            className={`relative min-h-[135px] rounded-[24px] border p-5 text-left transition-all ${
                                                selected
                                                    ? 'border-[#ed1c24] bg-[#ed1c24] text-white shadow-[0_12px_25px_rgba(237,28,36,0.2)]'
                                                    : 'border-transparent bg-white text-[#351b18] shadow-sm hover:border-[#f1d5d0]'
                                            }`}
                                        >
                                            <div
                                                className={`text-3xl ${
                                                    selected
                                                        ? ''
                                                        : 'opacity-90'
                                                }`}
                                            >
                                                {type.icon}
                                            </div>

                                            <div className="mt-7 text-lg font-bold">
                                                {type.name}
                                            </div>

                                            {selected && (
                                                <div className="absolute right-4 top-4 text-lg">
                                                    ✓
                                                </div>
                                            )}
                                        </button>
                                    )
                                })}
                            </div>
                        )}

                        {/* STEP 4 */}
                        {step === 4 && (
                            <div className="space-y-6">

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-[#351b18]">
                                        Package / item description
                                    </label>

                                    <textarea
                                        value={
                                            form.packageDetails
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                'packageDetails',
                                                event.target.value
                                            )
                                        }
                                        placeholder="What are you sending?"
                                        rows={4}
                                        className="w-full resize-none rounded-[22px] border border-[#efd5cf] bg-white px-5 py-4 text-[16px] text-[#351b18] outline-none transition placeholder:text-[#aa8b84] focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-[#351b18]">
                                        Recipient name
                                    </label>

                                    <input
                                        value={
                                            form.recipientName
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                'recipientName',
                                                event.target.value
                                            )
                                        }
                                        placeholder="e.g. John Moyo"
                                        className="w-full rounded-full border border-[#efd5cf] bg-white px-5 py-4 text-[16px] text-[#351b18] outline-none transition placeholder:text-[#aa8b84] focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-[#351b18]">
                                        Recipient phone
                                    </label>

                                    <input
                                        value={
                                            form.recipientPhone
                                        }
                                        onChange={(event) =>
                                            updateField(
                                                'recipientPhone',
                                                event.target.value
                                            )
                                        }
                                        placeholder="077 123 4567"
                                        type="tel"
                                        className="w-full rounded-full border border-[#efd5cf] bg-white px-5 py-4 text-[16px] text-[#351b18] outline-none transition placeholder:text-[#aa8b84] focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-bold text-[#351b18]">
                                        Additional instructions
                                    </label>

                                    <textarea
                                        placeholder="Please call when you arrive."
                                        rows={3}
                                        className="w-full resize-none rounded-[22px] border border-[#efd5cf] bg-white px-5 py-4 text-[16px] text-[#351b18] outline-none transition placeholder:text-[#aa8b84] focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                                {error}
                            </div>
                        )}

                        {/* CTA */}
                        <button
                            type="button"
                            onClick={continueStep}
                            className="mt-7 flex w-full items-center justify-center gap-3 rounded-full bg-[#ed1c24] px-6 py-4.5 text-[17px] font-bold text-white shadow-[0_12px_25px_rgba(237,28,36,0.2)] transition hover:bg-[#d91820] active:scale-[0.98]"
                        >
                            {step === 4
                                ? 'Review Delivery'
                                : 'Continue'}

                            <span className="text-xl">→</span>
                        </button>

                        {/* Back */}
                        {step > 1 && (
                            <button
                                type="button"
                                onClick={goBack}
                                className="mt-3 w-full py-2 text-sm font-semibold text-[#8b6259]"
                            >
                                ← Back
                            </button>
                        )}
                    </div>
                </section>

                {/* Bottom reassurance */}
                <p className="px-5 py-5 text-center text-xs leading-5 text-[#9a756d]">
                    Your information is only used to complete your
                    delivery.
                </p>
            </div>
        </main>
    )
}