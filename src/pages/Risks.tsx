import { AlertTriangle, Search, Filter, ShieldAlert, AlertCircle, ArrowUpRight } from 'lucide-react';

const Risks = () => {
  const risks = [
    { id: 'RSK-001', title: 'Unencrypted S3 Buckets in Prod', severity: 'Critical', status: 'Open', owner: 'Cloud Ops', framework: 'SOC 2', due: '2026-07-20' },
    { id: 'RSK-002', title: 'Missing MFA on Admin Accounts', severity: 'High', status: 'In Progress', owner: 'Identity Team', framework: 'ISO 27001', due: '2026-07-25' },
    { id: 'RSK-003', title: 'Outdated Vendor Risk Assessments', severity: 'Medium', status: 'Open', owner: 'Procurement', framework: 'Multiple', due: '2026-08-01' },
    { id: 'RSK-004', title: 'AI Model Training Data Bias', severity: 'High', status: 'Open', owner: 'Data Science', framework: 'ISO 42001', due: '2026-08-10' },
    { id: 'RSK-005', title: 'Delayed Offboarding for Contractors', severity: 'Medium', status: 'Resolved', owner: 'HR', framework: 'SOC 2', due: '2026-07-10' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Risks & Findings
          </h1>
          <p className="text-slate-500 text-sm mt-1">Track, prioritize, and remediate compliance gaps and security risks</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white font-semibold rounded-lg shadow-sm hover:bg-red-700 transition-colors">
          Report New Risk
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg"><ShieldAlert className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-slate-900">4</p><p className="text-xs font-semibold text-slate-500 uppercase">Critical & High</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg"><AlertCircle className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-slate-900">12</p><p className="text-xs font-semibold text-slate-500 uppercase">Total Open Risks</p></div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg"><ArrowUpRight className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold text-slate-900">7</p><p className="text-xs font-semibold text-slate-500 uppercase">Resolved this Month</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search findings..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 border border-slate-300 bg-white rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-white text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Risk Title</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Owner</th>
                <th className="px-6 py-4">Framework</th>
                <th className="px-6 py-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {risks.map((risk) => (
                <tr key={risk.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{risk.title}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{risk.id}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full font-bold text-[11px] uppercase tracking-wider ${
                      risk.severity === 'Critical' ? 'bg-red-100 text-red-700' : 
                      risk.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {risk.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-md font-medium text-xs ${
                      risk.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 
                      risk.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {risk.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{risk.owner}</td>
                  <td className="px-6 py-4 text-slate-600 font-medium">{risk.framework}</td>
                  <td className="px-6 py-4 text-slate-600">{risk.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Risks;
