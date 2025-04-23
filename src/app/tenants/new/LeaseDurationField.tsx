import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface LeaseDurationFieldProps {
  leaseStart: string
  leaseEnd: string
  onLeaseEndChange: (value: string) => void
  onLeaseDurationChange: (months: number) => void
}

export default function LeaseDurationField({ leaseStart, leaseEnd, onLeaseEndChange, onLeaseDurationChange }: LeaseDurationFieldProps) {
  const [duration, setDuration] = useState('')

  useEffect(() => {
    if (leaseStart && leaseEnd) {
      const start = new Date(leaseStart)
      const end = new Date(leaseEnd)
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
        setDuration(months > 0 ? months.toString() : '')
        onLeaseDurationChange(months > 0 ? months : 0)
      }
    }
  }, [leaseStart, leaseEnd, onLeaseDurationChange])

  const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^0-9]/g, '')
    setDuration(value)
    if (leaseStart && value) {
      const start = new Date(leaseStart)
      if (!isNaN(start.getTime())) {
        const months = parseInt(value, 10)
        const newEnd = new Date(start)
        newEnd.setMonth(newEnd.getMonth() + months)
        onLeaseEndChange(newEnd.toISOString().split('T')[0])
        onLeaseDurationChange(months)
      }
    } else {
      onLeaseEndChange('')
      onLeaseDurationChange(0)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="lease_duration">Durée du bail (mois)</Label>
      <Input
        id="lease_duration"
        type="number"
        min={1}
        placeholder="Durée en mois"
        value={duration}
        onChange={handleDurationChange}
      />
    </div>
  )
}
