'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type ImportRow = {
  code: string
  name: string
  amount: number
}

export default function MonthlyPage() {
  const [pasteData, setPasteData] = useState('')
  const [rows, setRows] = useState<ImportRow[]>([])
  const [savedRows, setSavedRows] = useState<ImportRow[]>([])

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  // =========================
  // เดือนปัจจุบัน
  // =========================

  const now = new Date()

  const recordMonth =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const monthText = new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(now)

  // =========================
  // ยอดรวม Preview
  // =========================

  const totalAmount = useMemo(() => {
    return rows.reduce((sum, row) => sum + row.amount, 0)
  }, [rows])

  // =========================
  // ยอดรวมข้อมูลที่บันทึกแล้ว
  // =========================

  const savedTotalAmount = useMemo(() => {
    return savedRows.reduce((sum, row) => sum + row.amount, 0)
  }, [savedRows])

  // =========================
  // โหลดข้อมูลเดือนปัจจุบัน
  // =========================

  useEffect(() => {
    loadCurrentMonth()
  }, [])

  async function loadCurrentMonth() {
    setLoading(true)

    const { data, error } = await supabase
      .from('monthly_records')
      .select('code,name,amount')
      .eq('record_month', recordMonth)
      .order('code', { ascending: true })

    if (error) {
      console.error('LOAD ERROR:', error)

      setMessage(
        `โหลดข้อมูลเดือนปัจจุบันไม่สำเร็จ: ${error.message}`
      )

      setLoading(false)
      return
    }

    const result: ImportRow[] = (data ?? []).map((item) => ({
      code: String(item.code ?? '').trim(),
      name: String(item.name ?? '').trim(),
      amount: Number(item.amount ?? 0),
    }))

    setSavedRows(result)
    setLoading(false)
  }

  // =========================
  // แปลงยอดเงิน
  // =========================

  function parseAmount(value: string) {
    const cleaned = value
      .replace(/,/g, '')
      .replace(/[฿\s]/g, '')
      .trim()

    const amount = Number(cleaned)

    return Number.isFinite(amount) ? amount : NaN
  }

  // =========================
  // อ่านข้อมูลจาก Google Sheet
  // =========================

  function handlePreview() {
    setMessage('')

    if (!pasteData.trim()) {
      setRows([])
      setMessage('กรุณาวางข้อมูลจาก Google Sheet ก่อน')
      return
    }

    const lines = pasteData
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)

    const parsedRows: ImportRow[] = []

    for (const line of lines) {
      // Google Sheet Copy หลาย Column จะคั่นด้วย Tab
      const columns = line.split('\t')

      if (columns.length < 3) {
        continue
      }

      const code = String(columns[0] ?? '').trim()
      const name = String(columns[1] ?? '').trim()
      const amountText = String(columns[2] ?? '').trim()

      const amount = parseAmount(amountText)

      // ข้าม Header
      const isHeader =
        code === 'รหัส' ||
        code.toLowerCase() === 'code' ||
        name.includes('ชื่อลูกค้า') ||
        amountText.includes('ยอดสินเชื่อ')

      if (isHeader) {
        continue
      }

      // ข้ามข้อมูลไม่สมบูรณ์
      if (!code || !name || Number.isNaN(amount)) {
        continue
      }

      parsedRows.push({
        code,
        name,
        amount,
      })
    }

    setRows(parsedRows)

    if (parsedRows.length === 0) {
      setMessage('ไม่พบข้อมูลที่สามารถนำเข้าได้')
      return
    }

    setMessage(
      `อ่านข้อมูลสำเร็จ ${parsedRows.length} รายการ`
    )
  }

  // =========================
  // บันทึก / Replace ข้อมูลเดือนนี้
  // =========================

  async function handleSave() {
    if (rows.length === 0) {
      alert('ยังไม่มีข้อมูลสำหรับบันทึก')
      return
    }

    const totalText = totalAmount.toLocaleString('th-TH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })

    let confirmText = ''

    if (savedRows.length > 0) {
      confirmText =
        `เดือน ${monthText} มีข้อมูลอยู่แล้ว ${savedRows.length} รายการ\n\n` +
        `ข้อมูลเดิมจะถูกลบและแทนที่ด้วยข้อมูลใหม่ ${rows.length} รายการ\n\n` +
        `ยอดรวมข้อมูลใหม่ ${totalText} บาท\n\n` +
        `ยืนยันการแทนที่ข้อมูลหรือไม่?`
    } else {
      confirmText =
        `ยืนยันบันทึก ${rows.length} รายการ\n\n` +
        `ประจำเดือน ${monthText}\n` +
        `ยอดรวม ${totalText} บาท`
    }

    if (!confirm(confirmText)) {
      return
    }

    setSaving(true)
    setMessage('กำลังบันทึกข้อมูล...')

    // =========================
    // 1. ลบข้อมูลเก่าของเดือนนี้
    // =========================

    const { error: deleteError } = await supabase
      .from('monthly_records')
      .delete()
      .eq('record_month', recordMonth)

    if (deleteError) {
      console.error('DELETE ERROR:', deleteError)

      alert(
        `ลบข้อมูลเดิมไม่สำเร็จ\n\n` +
        `Message: ${deleteError.message}\n` +
        `Code: ${deleteError.code}`
      )

      setMessage(
        `ลบข้อมูลเดิมไม่สำเร็จ: ${deleteError.message}`
      )

      setSaving(false)
      return
    }

    // =========================
    // 2. เตรียมข้อมูลชุดใหม่
    // =========================

    const payload = rows.map((row) => ({
      code: row.code,
      name: row.name,
      amount: row.amount,
      record_month: recordMonth,
      updated_at: new Date().toISOString(),
    }))

    // =========================
    // 3. Insert ข้อมูลชุดใหม่
    // =========================

    const { error: insertError } = await supabase
      .from('monthly_records')
      .insert(payload)

    if (insertError) {
      console.error('INSERT ERROR:', insertError)

      alert(
        `บันทึกข้อมูลใหม่ไม่สำเร็จ\n\n` +
        `Message: ${insertError.message}\n` +
        `Code: ${insertError.code}\n` +
        `Details: ${insertError.details ?? '-'}\n` +
        `Hint: ${insertError.hint ?? '-'}`
      )

      setMessage(
        `บันทึกข้อมูลใหม่ไม่สำเร็จ: ${insertError.message}`
      )

      setSaving(false)
      return
    }

    // =========================
    // 4. โหลดข้อมูลใหม่จาก Database
    // =========================

    await loadCurrentMonth()

    // =========================
    // 5. ล้าง Preview
    // =========================

    setPasteData('')
    setRows([])

    setSaving(false)

    setMessage(
      `บันทึกข้อมูลเดือน ${monthText} สำเร็จ ${payload.length} รายการ`
    )
  }

  // =========================
  // ล้างช่อง Paste
  // =========================

  function clearData() {
    setPasteData('')
    setRows([])
    setMessage('')
  }

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: '40px auto',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <h1 style={{ marginBottom: 5 }}>
        บันทึกยอดสินเชื่อ
      </h1>

      <div
        style={{
          fontSize: 18,
          color: '#555',
          marginBottom: 25,
        }}
      >
        ประจำเดือน {monthText}
      </div>

      {/* ========================= */}
      {/* IMPORT */}
      {/* ========================= */}

      <section
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          padding: 20,
          marginBottom: 25,
        }}
      >
        <h2 style={{ marginTop: 0 }}>
          นำเข้าจาก Google Sheet
        </h2>

        <p style={{ color: '#666' }}>
          Copy 3 คอลัมน์ รหัส + ชื่อ + ยอดสินเชื่อ
          แล้ววางในช่องด้านล่าง
        </p>

        <textarea
          value={pasteData}
          onChange={(e) => setPasteData(e.target.value)}
          placeholder={`ตัวอย่าง

0    โรงพยาบาลภักดีชุมพล    1,784.00
6    นางสาวสุรางค์           820.00
7    นางสาวอภัสสร            566.00`}
          style={{
            width: '100%',
            minHeight: 180,
            padding: 15,
            boxSizing: 'border-box',
            border: '1px solid #bbb',
            borderRadius: 8,
            fontSize: 16,
            resize: 'vertical',
          }}
        />

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginTop: 15,
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={handlePreview}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            อ่านข้อมูล
          </button>

          <button
            onClick={clearData}
            style={{
              padding: '10px 20px',
              cursor: 'pointer',
              fontSize: 16,
            }}
          >
            ล้างข้อมูล
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: 15,
              padding: 12,
              background: '#f5f5f5',
              borderRadius: 8,
            }}
          >
            {message}
          </div>
        )}
      </section>

      {/* ========================= */}
      {/* PREVIEW */}
      {/* ========================= */}

      {rows.length > 0 && (
        <section
          style={{
            border: '1px solid #ddd',
            borderRadius: 12,
            overflow: 'hidden',
            marginBottom: 30,
          }}
        >
          <div
            style={{
              padding: 20,
              borderBottom: '1px solid #ddd',
            }}
          >
            <strong>
              ตรวจสอบข้อมูลก่อนบันทึก
            </strong>

            <div style={{ marginTop: 5 }}>
              พบทั้งหมด {rows.length} รายการ
            </div>

            {savedRows.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  background: '#fff4d6',
                  borderRadius: 6,
                }}
              >
                เดือนนี้มีข้อมูลเดิม {savedRows.length} รายการ
                — เมื่อบันทึกข้อมูลชุดนี้
                ข้อมูลเดิมจะถูกแทนที่ทั้งหมด
              </div>
            )}
          </div>

          <DataTable
            rows={rows}
            total={totalAmount}
          />

          <div
            style={{
              padding: 20,
              textAlign: 'right',
            }}
          >
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 30px',
                fontSize: 16,
                cursor: saving
                  ? 'not-allowed'
                  : 'pointer',
                fontWeight: 'bold',
              }}
            >
              {saving
                ? 'กำลังบันทึก...'
                : savedRows.length > 0
                  ? 'แทนที่ข้อมูลเดือนนี้'
                  : 'บันทึกข้อมูล'}
            </button>
          </div>
        </section>
      )}

      {/* ========================= */}
      {/* SAVED DATA */}
      {/* ========================= */}

      <section
        style={{
          border: '1px solid #ddd',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: 20,
            borderBottom: '1px solid #ddd',
          }}
        >
          <h2 style={{ margin: 0 }}>
            ข้อมูลที่บันทึกแล้ว
          </h2>

          <div
            style={{
              marginTop: 6,
              color: '#666',
            }}
          >
            ประจำเดือน {monthText}
          </div>

          {!loading && (
            <div style={{ marginTop: 6 }}>
              ทั้งหมด {savedRows.length} รายการ
            </div>
          )}
        </div>

        {loading && (
          <div
            style={{
              padding: 30,
              textAlign: 'center',
            }}
          >
            กำลังโหลดข้อมูล...
          </div>
        )}

        {!loading && savedRows.length === 0 && (
          <div
            style={{
              padding: 40,
              textAlign: 'center',
              color: '#777',
            }}
          >
            เดือนนี้ยังไม่มีข้อมูล
          </div>
        )}

        {!loading && savedRows.length > 0 && (
          <DataTable
            rows={savedRows}
            total={savedTotalAmount}
          />
        )}
      </section>
    </main>
  )
}

// =========================
// TABLE COMPONENT
// =========================

function DataTable({
  rows,
  total,
}: {
  rows: ImportRow[]
  total: number
}) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <thead>
          <tr style={{ background: '#f5f5f5' }}>
            <th style={thStyle}>#</th>
            <th style={thStyle}>รหัส</th>
            <th style={thStyle}>ชื่อ</th>

            <th
              style={{
                ...thStyle,
                textAlign: 'right',
              }}
            >
              ยอดสินเชื่อ
            </th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.code}-${index}`}>
              <td style={tdStyle}>
                {index + 1}
              </td>

              <td style={tdStyle}>
                <strong>{row.code}</strong>
              </td>

              <td style={tdStyle}>
                {row.name}
              </td>

              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                }}
              >
                {row.amount.toLocaleString('th-TH', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr
            style={{
              background: '#f5f5f5',
              fontWeight: 'bold',
            }}
          >
            <td
              colSpan={3}
              style={{
                ...tdStyle,
                textAlign: 'right',
              }}
            >
              ยอดรวม
            </td>

            <td
              style={{
                ...tdStyle,
                textAlign: 'right',
                fontSize: 18,
              }}
            >
              {total.toLocaleString('th-TH', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              บาท
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

// =========================
// STYLE
// =========================

const thStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #ddd',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: 12,
  borderBottom: '1px solid #eee',
}