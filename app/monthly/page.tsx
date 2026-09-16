'use client'

import { ClipboardEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Member = {
  id: number
  code: string
  name: string
}

type MonthlyRow = Member & {
  monthly: string
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

export default function MonthlyPage() {
  const now = new Date()

  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear() + 543)

  const [rows, setRows] = useState<MonthlyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [month, year])

  function getPeriod() {
    const christianYear = year - 543

    return `${christianYear}-${String(month).padStart(2, '0')}-01`
  }

  async function loadData() {
    setLoading(true)

    const period = getPeriod()

    // รายชื่อที่ยังใช้งาน
    const { data: members, error: memberError } = await supabase
      .from('members')
      .select('id, code, name')
      .eq('active', true)
      .order('id', { ascending: true })

    if (memberError) {
      alert(memberError.message)
      setLoading(false)
      return
    }

    // ยอดที่เคยบันทึกในเดือนนี้
    const { data: records, error: recordError } = await supabase
      .from('monthly_records')
      .select('member_id, monthly')
      .eq('period', period)

    if (recordError) {
      alert(recordError.message)
      setLoading(false)
      return
    }

    const recordMap = new Map(
      (records ?? []).map((record) => [
        record.member_id,
        record.monthly,
      ])
    )

    const result: MonthlyRow[] = (members ?? []).map((member) => ({
      ...member,

      monthly:
        recordMap.get(member.id) !== undefined
          ? String(recordMap.get(member.id))
          : '',
    }))

    setRows(result)
    setLoading(false)
  }

  function updateMonthly(index: number, value: string) {
    // อนุญาตเลขและจุดทศนิยม
    const cleaned = value.replace(/,/g, '')

    if (cleaned !== '' && !/^\d*\.?\d*$/.test(cleaned)) {
      return
    }

    setRows((current) =>
      current.map((row, i) =>
        i === index
          ? { ...row, monthly: cleaned }
          : row
      )
    )
  }

  function handlePaste(
    e: ClipboardEvent<HTMLInputElement>,
    startIndex: number
  ) {
    const text = e.clipboardData.getData('text')

    if (!text) return

    // รองรับทั้ง Excel และ Google Sheets
    const values = text
      .split(/\r?\n/)
      .map((value) => value.split('\t')[0].trim())
      .filter((value) => value !== '')

    // ถ้ามีค่าเดียว ให้ browser paste ตามปกติ
    if (values.length <= 1) return

    e.preventDefault()

    setRows((current) => {
      const updated = [...current]

      values.forEach((value, offset) => {
        const targetIndex = startIndex + offset

        if (targetIndex >= updated.length) return

        const cleaned = value.replace(/,/g, '')

        if (/^\d*\.?\d*$/.test(cleaned)) {
          updated[targetIndex] = {
            ...updated[targetIndex],
            monthly: cleaned,
          }
        }
      })

      return updated
    })
  }

  const total = useMemo(() => {
    return rows.reduce((sum, row) => {
      return sum + (Number(row.monthly) || 0)
    }, 0)
  }, [rows])

  async function saveMonthly() {
    setSaving(true)

    const period = getPeriod()

    const records = rows
      .filter((row) => row.monthly !== '')
      .map((row) => ({
        member_id: row.id,
        period,
        monthly: Number(row.monthly),
        updated_at: new Date().toISOString(),
      }))

    if (records.length === 0) {
      alert('ยังไม่มีข้อมูล Monthly ให้บันทึก')
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('monthly_records')
      .upsert(records, {
        onConflict: 'member_id,period',
      })

    setSaving(false)

    if (error) {
      alert(error.message)
      return
    }

    alert('บันทึกข้อมูลเรียบร้อย')

    await loadData()
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">

        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            บันทึกยอดประจำเดือน
          </h1>

          <p className="mt-1 text-gray-500">
            กรอกยอดเอง หรือ Copy จาก Excel / Google Sheets มาวางได้
          </p>
        </div>

        {/* Period */}

        <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">

          <div className="grid gap-4 sm:grid-cols-2">

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                เดือน
              </label>

              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >
                {months.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                ปี พ.ศ.
              </label>

              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

          </div>
        </div>

        {/* Table */}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">

          <div className="flex items-center justify-between border-b p-4">
            <div>
              <span className="font-semibold">
                {months[month - 1]} {year}
              </span>

              <span className="ml-2 text-sm text-gray-500">
                {rows.length} รายการ
              </span>
            </div>

            <div className="text-right">
              <div className="text-sm text-gray-500">
                ยอดรวม
              </div>

              <div className="text-xl font-bold">
                {total.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                บาท
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">
              กำลังโหลด...
            </div>
          ) : (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[700px]">

                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-16 px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="w-56 px-4 py-3 text-right">
                      Monthly
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className="border-t"
                    >
                      <td className="px-4 py-2 text-gray-500">
                        {index + 1}
                      </td>

                      <td className="px-4 py-2 font-medium">
                        {row.code}
                      </td>

                      <td className="px-4 py-2">
                        {row.name}
                      </td>

                      <td className="px-4 py-2">
                        <input
                          inputMode="decimal"
                          value={row.monthly}
                          onChange={(e) =>
                            updateMonthly(index, e.target.value)
                          }
                          onPaste={(e) =>
                            handlePaste(e, index)
                          }
                          placeholder="0.00"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right focus:border-black focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>

            </div>
          )}

          <div className="flex items-center justify-between border-t p-4">

            <span className="text-sm text-gray-500">
              Tip: Copy คอลัมน์ยอดจาก Google Sheets แล้ววางที่ช่อง Monthly แถวแรก
            </span>

            <button
              onClick={saveMonthly}
              disabled={saving || loading}
              className="rounded-lg bg-black px-6 py-2.5 font-medium text-white disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึก'}
            </button>

          </div>

        </div>
      </div>
    </main>
  )
}