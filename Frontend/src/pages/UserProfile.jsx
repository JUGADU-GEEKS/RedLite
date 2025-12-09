import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getAuthHeaders } from '../services/auth'
import Navbar from '../components/Navbar'
import { User as UserIcon } from 'lucide-react'

export default function UserProfile(){
  const { t } = useTranslation(['pages', 'common'])
  const [profile, setProfile] = useState(null)
  const [sos, setSos] = useState([])
  const [echallans, setEchallans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(()=>{
    const API_BASE = import.meta.env.VITE_API_BASE || import.meta.env.VITE_API_URL || '';
    const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() }

    async function load(){
      setLoading(true)
      try{
        const [pRes, sRes, eRes] = await Promise.all([
          fetch(`${API_BASE}/auth/profile`, { headers }),
          fetch(`${API_BASE}/sos/user`, { headers }),
          fetch(`${API_BASE}/auth/echallans`, { headers })
        ])
        if(pRes.ok){
          const pj = await pRes.json();
          setProfile(pj.user || pj)
        }
        if(sRes.ok){
          const sj = await sRes.json();
          setSos(sj.items || [])
        }
        if(eRes.ok){
          const ej = await eRes.json();
          setEchallans(ej.items || [])
        }
      }catch(err){
        console.error('Failed to load profile data', err)
      }finally{ setLoading(false) }
    }
    load()
  },[])

  if (loading) return <div className="p-6">{t('common:loading')}</div>
  if (!profile) return <div className="p-6">{t('common:notAuthenticated')}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 relative overflow-hidden">
      <Navbar />
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold">{t('pages:userProfile.title')}</h2>
          <p className="text-sm text-gray-600">{t('pages:userProfile.manageAccount')}</p>
        </div>

        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="lg:w-1/3 flex-shrink-0">
              <div className="p-6 rounded-xl bg-gradient-to-br from-orange-50 to-yellow-50 border border-orange-200/40">
                <div className="w-full flex flex-col items-center">
                  <div className="w-28 h-28 rounded-full bg-white/80 flex items-center justify-center shadow-md">
                    <UserIcon size={48} className="text-orange-500" />
                  </div>
                  <div className="mt-4 text-center">
                    <div className="text-lg font-semibold">{profile.name}</div>
                    <div className="text-sm text-gray-600">{profile.email}</div>
                    <div className="mt-2 text-sm text-gray-700">{profile.mobile || t('pages:userProfile.notProvided')}</div>
                    <div className="mt-2 text-sm text-red-600 font-bold">
                      {t('pages:userProfile.faultTolerance')}: {profile.fault_count || 0} / 3
                      {profile.suspended && (
                        <div className="text-red-700 font-bold mt-1">{t('pages:userProfile.accountSuspended')}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:w-2/3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white rounded-lg border">
                  <h4 className="font-semibold mb-3">{t('pages:userProfile.contactInformation')}</h4>
                  <div className="text-sm text-gray-700 space-y-2">
                    <div><span className="font-medium">{t('pages:userProfile.phone')}:</span> {profile.mobile || t('pages:userProfile.notProvided')}</div>
                    <div><span className="font-medium">{t('pages:userProfile.email')}:</span> {profile.email}</div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3">{t('pages:userProfile.sosHistory')}</h3>
                {sos.length === 0 ? (
                  <div className="text-sm text-gray-500">{t('pages:userProfile.noSosRecords')}</div>
                ) : (
                  <ul className="space-y-3">
                    {sos.map(item => (
                      <li key={item.caseId} className="border p-3 rounded-md bg-gray-50">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-semibold">{t('pages:userProfile.case')}: {item.caseId}</div>
                            <div className="text-sm text-gray-600">{t('pages:userProfile.time')}: {item.timestamp}</div>
                          </div>
                          <div className="text-sm">
                            <div>{t('common:status')}: {item.status}</div>
                            <div>{t('pages:userProfile.notified')}: {item.authorities ? item.authorities.length : (item.sms ? item.sms.length : 0)}</div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-xl font-semibold mb-3">{t('pages:userProfile.echallanHistory')}</h3>
                {echallans.length === 0 ? (
                  <div className="text-sm text-gray-500">{t('pages:userProfile.noChallans')}</div>
                ) : (
                  <ul className="space-y-3">
                    {echallans.map(c => (
                      <li key={c.id} className="border p-3 rounded-md bg-gray-50">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-semibold">{c.title || t('pages:userProfile.challan')}</div>
                            <div className="text-sm text-gray-600">{t('pages:userProfile.issued')}: {c.issuedAt}</div>
                          </div>
                          <div className="text-sm">{t('common:status')}: {c.status}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
