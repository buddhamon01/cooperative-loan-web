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
    <main className="min-h-screen bg-[#070b10] p-4 text-slate-50 md:p-8">
      <div className="mx-auto max-w-5xl">

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            จัดการรายชื่อ
          </h1>

          <p className="mt-1 text-slate-300">
            เพิ่ม Code และ Name สำหรับใช้บันทึกยอดประจำเดือน
          </p>
        </div>

        {/* Add member */}

        <form
          onSubmit={addMember}
          className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-lg shadow-slate-950/30"
        >
          <h2 className="mb-4 font-semibold text-white">
            + เพิ่มรายชื่อ
          </h2>

          <div className="grid gap-4 md:grid-cols-[200px_1fr_auto]">

            <div>
              <label className="mb-1 block text-sm text-slate-300">
                Code
              </label>

              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400"
                placeholder="เช่น 001"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-slate-300">
                Name
              </label>

              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400"
                placeholder="ชื่อ"
              />
            </div>

            <div className="flex items-end">
              <button
                disabled={saving}
                className="w-full rounded-lg bg-slate-100 px-5 py-2 font-medium text-slate-900 disabled:opacity-50"
              >
                {saving ? 'กำลังเพิ่ม...' : '+ Add'}
              </button>
            </div>

          </div>
        </form>

        {/* Member list */}

        <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-lg shadow-slate-950/30">

          <div className="border-b border-slate-700 bg-slate-900 p-4">
            <span className="font-semibold text-white">
              รายชื่อทั้งหมด
            </span>

            <span className="ml-2 text-sm text-slate-300">
              {members.length} รายการ
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-300">
              กำลังโหลด...
            </div>
          ) : (

            <div className="overflow-x-auto">
              <table className="w-full text-slate-100">

                <thead className="bg-slate-800">
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
                      className="border-t border-slate-700"
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