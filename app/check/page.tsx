'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Detail = {
  id: number
  code: string
  name: string
  monthly: number
}

const months = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

export default function CheckPage() {
  const now = new Date()

  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()
  const thaiYear = currentYear + 543

  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Detail[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function getCurrentPeriod() {
    return `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`
  }

  async function search(e: FormEvent) {
    e.preventDefault()

    const searchText = keyword.trim()

    setResults([])
    setMessage('')

    if (!searchText) {
      setMessage('กรุณากรอกรหัสหรือชื่อ')
      return
    }

    setLoading(true)

    // ค้นหาด้วย Code หรือ Name
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id, code, name')
      .or(`code.ilike.%${searchText}%,name.ilike.%${searchText}%`)
      .order('code', { ascending: true })
      .limit(20)

    if (memberError) {
      setLoading(false)
      setMessage(memberError.message)
      return
    }

    if (!members || members.length === 0) {
      setLoading(false)
      setMessage(`ไม่พบข้อมูล "${searchText}"`)
      return
    }

    const memberIds = members.map((member) => member.id)

    // ดึงเฉพาะยอดของเดือนปัจจุบัน
    const { data: records, error: recordError } = await supabase
      .from('monthly_records')
      .select('member_id, monthly')
      .in('member_id', memberIds)
      .eq('period', getCurrentPeriod())

    setLoading(false)

    if (recordError) {
      setMessage(recordError.message)
      return
    }

    const amountMap = new Map(
      (records ?? []).map((record) => [
        record.member_id,
        Number(record.monthly),
      ])
    )

    const result: Detail[] = members.map((member) => ({
      id: member.id,
      code: member.code,
      name: member.name,
      monthly: amountMap.get(member.id) ?? 0,
    }))

    setResults(result)
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            ตรวจสอบยอด
          </h1>

          <p className="mt-1 text-gray-500">
            ประจำเดือน {months[currentMonth - 1]} {thaiYear}
          </p>
        </div>

        {/* Search */}

        <form
          onSubmit={search}
          className="mb-6 rounded-xl bg-white p-5 shadow-sm"
        >
          <label className="mb-1 block text-sm text-gray-600">
            ค้นหา
          </label>

          <div className="flex gap-2">

            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="กรอกรหัส หรือ ชื่อ"
              className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2"
            />

            <button
              disabled={loading}
              className="rounded-lg bg-black px-6 py-2 text-white disabled:opacity-50"
            >
              {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
            </button>

          </div>
        </form>

        {/* Message */}

        {message && (
          <div className="rounded-xl bg-white p-5 text-center shadow-sm">
            {message}
          </div>
        )}

        {/* Results */}

        {results.length > 0 && (
          <div className="space-y-4">

            {results.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-xl bg-white shadow-sm"
              >

                <div className="border-b px-6 py-3 text-sm text-gray-500">
                  {months[currentMonth - 1]} {thaiYear}
                </div>

                <div className="p-6">

                  <div className="grid grid-cols-[80px_1fr] gap-y-3">

                    <div className="text-gray-500">
                      รหัส
                    </div>

                    <div className="font-semibold">
                      {item.code}
                    </div>

                    <div className="text-gray-500">
                      ชื่อ
                    </div>

                    <div className="font-semibold">
                      {item.name}
                    </div>

                  </div>

                  <div className="mt-5 border-t pt-5">

                    <div className="text-sm text-gray-500">
                      ยอด
                    </div>

                    <div className="mt-1 text-3xl font-bold">

                      {item.monthly.toLocaleString('th-TH', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}

                      <span className="ml-2 text-lg font-normal text-gray-500">
                        บาท
                      </span>

                    </div>

                  </div>

                </div>

              </div>
            ))}

          </div>
        )}

      </div>
    </main>
  )
}