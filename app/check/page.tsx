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
      }}
    >
      {/* HEADER */}

      <h1 style={{ marginBottom: 5 }}>
        ตรวจสอบยอด
      </h1>

      <div
        style={{
          color: '#666',
          marginBottom: 25,
        }}
      >
        ประจำเดือน {monthText}
      </div>

      {/* SEARCH */}

      <form
        onSubmit={handleSearch}
        style={{
          background: '#fff',
          border: '1px solid #ddd',
          borderRadius: 12,
          padding: 20,
          marginBottom: 25,
        }}
      >
        <label
          style={{
            display: 'block',
            marginBottom: 8,
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
              border: '1px solid #ccc',
              borderRadius: 8,
            }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '12px 25px',
              background: '#000',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              cursor: loading
                ? 'not-allowed'
                : 'pointer',
            }}
          >
            {loading ? 'กำลังค้นหา...' : 'ค้นหา'}
          </button>
        </div>

        {errorMessage && (
          <div
            style={{
              marginTop: 15,
              color: '#c00',
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
              background: '#fff',
              border: '1px solid #ddd',
              borderRadius: 12,
              padding: 25,
              textAlign: 'center',
            }}
          >
            ไม่พบข้อมูล &quot;{search}&quot;
            <div
              style={{
                marginTop: 5,
                color: '#777',
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
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: 12,
                padding: 25,
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
                      color: '#777',
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
                      color: '#777',
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
                      color: '#777',
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