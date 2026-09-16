'use client'

import { FormEvent, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Member = {
  id: number
  code: string
  name: string
  active: boolean
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadMembers()
  }, [])

  async function loadMembers() {
    setLoading(true)

    const { data, error } = await supabase
      .from('members')
      .select('id, code, name, active')
      .order('id')

    if (error) {
      alert(error.message)
      setLoading(false)
      return
    }

    setMembers(data ?? [])
    setLoading(false)
  }

  async function addMember(e: FormEvent) {
    e.preventDefault()

    const cleanCode = code.trim()
    const cleanName = name.trim()

    if (!cleanCode || !cleanName) {
      alert('กรุณากรอก Code และ Name')
      return
    }

    setSaving(true)

    const { error } = await supabase
      .from('members')
      .insert({
        code: cleanCode,
        name: cleanName,
      })

    setSaving(false)

    if (error) {
      if (error.code === '23505') {
        alert('Code นี้มีอยู่แล้ว')
      } else {
        alert(error.message)
      }
      return
    }

    setCode('')
    setName('')

    await loadMembers()
  }

  async function toggleMember(member: Member) {
    const { error } = await supabase
      .from('members')
      .update({
        active: !member.active,
      })
      .eq('id', member.id)

    if (error) {
      alert(error.message)
      return
    }

    await loadMembers()
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            จัดการรายชื่อ
          </h1>

          <p className="mt-1 text-gray-500">
            เพิ่ม Code และ Name สำหรับใช้บันทึกยอดประจำเดือน
          </p>
        </div>

        {/* Add member */}

        <form
          onSubmit={addMember}
          className="mb-6 rounded-xl bg-white p-5 shadow-sm"
        >
          <h2 className="mb-4 font-semibold text-gray-900">
            + เพิ่มรายชื่อ
          </h2>

          <div className="grid gap-4 md:grid-cols-[200px_1fr_auto]">

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Code
              </label>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="เช่น 001"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Name
              </label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
                placeholder="ชื่อ"
              />
            </div>

            <div className="flex items-end">
              <button
                disabled={saving}
                className="w-full rounded-lg bg-black px-5 py-2 text-white disabled:opacity-50"
              >
                {saving ? 'กำลังเพิ่ม...' : '+ Add'}
              </button>
            </div>

          </div>
        </form>

        {/* Member list */}

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">

          <div className="border-b p-4">
            <span className="font-semibold">
              รายชื่อทั้งหมด
            </span>

            <span className="ml-2 text-sm text-gray-500">
              {members.length} รายการ
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              กำลังโหลด...
            </div>
          ) : (

            <div className="overflow-x-auto">
              <table className="w-full">

                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <th className="px-4 py-3 text-left">Code</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-center">สถานะ</th>
                    <th className="px-4 py-3 text-center">จัดการ</th>
                  </tr>
                </thead>

                <tbody>

                  {members.map((member, index) => (
                    <tr
                      key={member.id}
                      className="border-t"
                    >
                      <td className="px-4 py-3">
                        {index + 1}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        {member.code}
                      </td>

                      <td className="px-4 py-3">
                        {member.name}
                      </td>

                      <td className="px-4 py-3 text-center">
                        {member.active ? (
                          <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                            ใช้งาน
                          </span>
                        ) : (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-500">
                            ปิดใช้งาน
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleMember(member)}
                          className="rounded-lg border px-3 py-1.5 text-sm"
                        >
                          {member.active
                            ? 'ปิดใช้งาน'
                            : 'เปิดใช้งาน'}
                        </button>
                      </td>

                    </tr>
                  ))}

                </tbody>
              </table>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}