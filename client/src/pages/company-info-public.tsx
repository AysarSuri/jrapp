import { useEffect, useState } from "react";
import { Phone, MapPin, MessageCircle, Navigation } from "lucide-react";

type CompanyInfo = {
  name: string;
  address: string;
  addressName: string;
  mobile1: string;
  mobile2: string;
  mobile1Whatsapp: string;
  mobile2Whatsapp: string;
  gpsLocation: string;
  facebookLink: string;
  instagramLink: string;
  tiktokLink: string;
  snapchatLink: string;
  businessType: string;
  logo: string | null;
};

export default function CompanyInfoPublic() {
  const [info, setInfo] = useState<CompanyInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/public/company-info")
      .then(res => res.ok ? res.json() : null)
      .then(data => { setInfo(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f8fafc" }}>
        <div style={{ width: 40, height: 40, border: "4px solid #e2e8f0", borderTopColor: "#3b82f6", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!info) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f8fafc" }}>
        <p style={{ color: "#64748b", fontSize: 18 }}>Company info not available</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", display: "flex", justifyContent: "center", alignItems: "center", padding: 20, fontFamily: "'Inter', 'Tajawal', sans-serif" }}>
      <div style={{ background: "white", borderRadius: 20, padding: 32, maxWidth: 420, width: "100%", boxShadow: "0 25px 50px rgba(0,0,0,0.15)" }}>
        {info.logo && (
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <img src={info.logo} alt={info.name} style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "3px solid #e2e8f0" }} />
          </div>
        )}

        <h1 style={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: "#1e293b", marginBottom: 4 }} data-testid="text-company-name">
          {info.name}
        </h1>
        {info.businessType && (
          <p style={{ textAlign: "center", fontSize: 14, color: "#64748b", marginBottom: 20 }} data-testid="text-business-type">
            {info.businessType}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {(info.addressName || info.address) && (
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f8fafc", borderRadius: 12 }}>
              <MapPin style={{ width: 20, height: 20, color: "#ef4444", flexShrink: 0 }} />
              <span style={{ fontSize: 14, color: "#334155" }} data-testid="text-address">{info.addressName || info.address}</span>
            </div>
          )}

          {info.mobile1 && (
            <a href={`tel:${info.mobile1}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f8fafc", borderRadius: 12, textDecoration: "none", color: "#334155" }} data-testid="link-mobile1">
              <Phone style={{ width: 20, height: 20, color: "#3b82f6", flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>{info.mobile1}</span>
            </a>
          )}

          {info.mobile1Whatsapp && (
            <a href={`https://wa.me/${info.mobile1Whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#dcfce7", borderRadius: 12, textDecoration: "none", color: "#166534" }} data-testid="link-whatsapp1">
              <MessageCircle style={{ width: 20, height: 20, color: "#22c55e", flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>WhatsApp: {info.mobile1Whatsapp}</span>
            </a>
          )}

          {info.mobile2 && (
            <a href={`tel:${info.mobile2}`} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#f8fafc", borderRadius: 12, textDecoration: "none", color: "#334155" }} data-testid="link-mobile2">
              <Phone style={{ width: 20, height: 20, color: "#3b82f6", flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>{info.mobile2}</span>
            </a>
          )}

          {info.mobile2Whatsapp && (
            <a href={`https://wa.me/${info.mobile2Whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#dcfce7", borderRadius: 12, textDecoration: "none", color: "#166534" }} data-testid="link-whatsapp2">
              <MessageCircle style={{ width: 20, height: 20, color: "#22c55e", flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>WhatsApp: {info.mobile2Whatsapp}</span>
            </a>
          )}

          {info.gpsLocation && (
            <a href={info.gpsLocation.startsWith("http") ? info.gpsLocation : `https://maps.google.com/?q=${info.gpsLocation}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "#fef3c7", borderRadius: 12, textDecoration: "none", color: "#92400e" }} data-testid="link-gps">
              <Navigation style={{ width: 20, height: 20, color: "#f59e0b", flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>View on Map</span>
            </a>
          )}
        </div>

        {(info.facebookLink || info.instagramLink || info.tiktokLink || info.snapchatLink) && (
          <>
            <div style={{ height: 1, background: "#e2e8f0", margin: "20px 0" }} />
            <div style={{ display: "flex", justifyContent: "center", gap: 16 }}>
              {info.facebookLink && (
                <a href={info.facebookLink.startsWith("http") ? info.facebookLink : `https://${info.facebookLink}`} target="_blank" rel="noopener noreferrer" style={{ width: 44, height: 44, borderRadius: "50%", background: "#1877f2", display: "flex", alignItems: "center", justifyContent: "center", color: "white", textDecoration: "none", fontSize: 20, fontWeight: 700 }} data-testid="link-facebook">
                  f
                </a>
              )}
              {info.instagramLink && (
                <a href={info.instagramLink.startsWith("http") ? info.instagramLink : `https://${info.instagramLink}`} target="_blank" rel="noopener noreferrer" style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", textDecoration: "none", fontSize: 18 }} data-testid="link-instagram">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
              )}
              {info.tiktokLink && (
                <a href={info.tiktokLink.startsWith("http") ? info.tiktokLink : `https://${info.tiktokLink}`} target="_blank" rel="noopener noreferrer" style={{ width: 44, height: 44, borderRadius: "50%", background: "#000000", display: "flex", alignItems: "center", justifyContent: "center", color: "white", textDecoration: "none", fontSize: 14, fontWeight: 700 }} data-testid="link-tiktok">
                  TT
                </a>
              )}
              {info.snapchatLink && (
                <a href={info.snapchatLink.startsWith("http") ? info.snapchatLink : `https://${info.snapchatLink}`} target="_blank" rel="noopener noreferrer" style={{ width: 44, height: 44, borderRadius: "50%", background: "#fffc00", display: "flex", alignItems: "center", justifyContent: "center", color: "#000", textDecoration: "none", fontSize: 18 }} data-testid="link-snapchat">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg>
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
