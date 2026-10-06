'use client'

import { FormEvent, useState } from 'react'
import { supabase } from '@/lib/supabase'

type LoanRecord = {
  code: string
  name: string
  amount: number
  record_month: string
}

export default function CheckPage() {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<LoanRecord[]>([])
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // เดือนปัจจุบัน เช่น 2026-09-01
  const now = new Date()

  const recordMonth =
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const monthText = new Intl.DateTimeFormat('th-TH', {
    month: 'long',
    year: 'numeric',
  }).format(now)

  async function handleSearch(e: FormEvent) {
    e.preventDefault()

    const keyword = search.trim()

    if (!keyword) {
      setResults([])
      setSearched(false)
      setErrorMessage('กรุณากรอกรหัสหรือชื่อ')
      return
    }

    setLoading(true)
    setSearched(false)
    setErrorMessage('')
    setResults([])

    // ค้นเฉพาะข้อมูลของเดือนปัจจุบัน
    // ค้นได้ทั้ง code และ name
    const { data, error } = await supabase
      .from('monthly_records')
      .select('code,name,amount,record_month')
      .eq('record_month', recordMonth)
      .or(`code.eq.${keyword},name.ilike.%${keyword}%`)
      .order('code', { ascending: true })

    setLoading(false)
    setSearched(true)

    if (error) {
      console.error('SEARCH ERROR:', error)

      setErrorMessage(
        `ค้นหาไม่สำเร็จ: ${error.message}`
      )

      return
    }

    const mapped: LoanRecord[] = (data ?? []).map((item) => ({
      code: String(item.code ?? ''),
      name: String(item.name ?? ''),
      amount: Number(item.amount ?? 0),
      record_month: String(item.record_month ?? ''),
    }))

    setResults(mapped)
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: '40px auto',
        padding: 20,
        fontFamily: 'Arial, sans-serif',
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      {/* HEADER */}

      <h1 style={{ marginBottom: 5, color: 'var(--foreground)', fontSize: 32 }}>
        ตรวจสอบยอด
      </h1>

      <div
        style={{
          color: 'var(--muted)',
          marginBottom: 25,
        }}
      >
        ประจำเดือน {monthText}
      </div>

      {/* SEARCH */}

      <form
        onSubmit={handleSearch}
        style={{
          background: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 20,
          marginBottom: 25,
          boxShadow: '0 10px 25px var(--shadow)',
        }}
      >
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            color: 'var(--foreground)',
          }}
        >
          ค้นหาด้วยรหัส หรือชื่อ
        </label>

        <div
          style={{
            display: 'flex',
            gap: 10,
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="เช่น 100 หรือ นายสมชาย"
            autoComplete="off"
            style={{
              flex: 1,
              padding: '12px 14px',
              fontSize: 16,
              border: '1px solid var(--input-border)',
              borderRadius: 8,
              background: 'var(--input-bg)',
              color: 'var(--foreground)',
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 25px',
              background: 'var(--button)',
              color: 'var(--button-text)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              fontSize: 16,
              cursor: loading
                ? 'not-allowed'
                : 'pointer',
              fontWeight: 700,
            }}
          >
            {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              marginTop: 15,
              color: '#fca5a5',
            }}
          >
            {errorMessage}
          </div>
        )}
      </form>

      {/* NOT FOUND */}

      {searched &&
        !loading &&
        results.length === 0 &&
        !errorMessage && (
          <section
            style={{
              background: 'var(--panel)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: 25,
              textAlign: 'center',
              boxShadow: '0 10px 25px var(--shadow)',
            }}
          >
            ไม่พบข้อมูล &quot;{search}&quot;
            <div
              style={{
                marginTop: 5,
                color: 'var(--muted)',
              }}
            >
              ประจำเดือน {monthText}
            </div>
          </section>
        )}

      {/* RESULT */}

      {results.length > 0 && (
        <div
          style={{
            display: 'grid',
            gap: 15,
          }}
        >
          {results.map((item, index) => (
            <section
              key={`${item.code}-${index}`}
              style={{
                background: 'var(--panel)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 25,
                boxShadow: '0 10px 25px var(--shadow)',
              }}
            >
              <div
                style={{
                  display: 'grid',
                  gap: 15,
                }}
              >
                <div>
                  <div
                    style={{
                      color: 'var(--muted)',
                      fontSize: 14,
                    }}
                  >
                    รหัส
                  </div>

                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 'bold',
                    }}
                  >
                    {item.code}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      color: 'var(--muted)',
                      fontSize: 14,
                    }}
                  >
                    ชื่อ
                  </div>

                  <div
                    style={{
                      fontSize: 20,
                    }}
                  >
                    {item.name}
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      color: 'var(--muted)',
                      fontSize: 14,
                    }}
                  >
                    ยอดสินเชื่อ
                  </div>

                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 'bold',
                    }}
                  >
                    {item.amount.toLocaleString('th-TH', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    บาท
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  )
}