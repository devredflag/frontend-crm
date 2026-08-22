import { getToken } from "../../services/auth";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://backend-crm-production-157b.up.railway.app";

export default function OutlookCallback() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading"|"success"|"error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      setMsg("Autorização cancelada ou negada.");
      setTimeout(() => navigate("/calendario"), 3000);
      return;
    }

    if (!code) {
      setStatus("error");
      setMsg("Código de autorização não encontrado.");
      setTimeout(() => navigate("/calendario"), 3000);
      return;
    }

    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    fetch(`${API}/auth/outlook/callback?code=${encodeURIComponent(code)}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    })
      .then(res => res.json())
      .then(data => {
        if (data.msg) {
          setStatus("success");
          setMsg("Outlook conectado com sucesso!");
          setTimeout(() => navigate("/calendario"), 2000);
        } else {
          setStatus("error");
          setMsg(data.detail || "Erro ao conectar Outlook.");
          setTimeout(() => navigate("/calendario"), 3000);
        }
      })
      .catch(() => {
        setStatus("error");
        setMsg("Erro de conexão com o servidor.");
        setTimeout(() => navigate("/calendario"), 3000);
      });
    // Troca do `code` do OAuth roda uma única vez na montagem: o código de
    // autorização é de uso único e re-executar invalidaria a sessão recém-criada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#F6F7F8", fontFamily:"sans-serif" }}>
      <div style={{ background:"#ffffff", borderRadius:8, padding:"40px 48px", textAlign:"center", boxShadow:"none", maxWidth:360 }}>
        {status === "loading" && (
          <>
            <div style={{ width:48, height:48, border:"4px solid rgba(0,120,212,0.15)", borderTop:"4px solid #0078D4", borderRadius:"50%", margin:"0 auto 20px", animation:"spin 0.8s linear infinite" }} />
            <div style={{ fontSize:16, fontWeight:700, color:"#16191D" }}>Conectando Outlook...</div>
            <div style={{ fontSize:13, color:"#5B6570", marginTop:8 }}>Aguarde um momento</div>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#16191D" }}>{msg}</div>
            <div style={{ fontSize:13, color:"#5B6570", marginTop:8 }}>Redirecionando para o calendário...</div>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
            <div style={{ fontSize:16, fontWeight:700, color:"#B42318" }}>{msg}</div>
            <div style={{ fontSize:13, color:"#5B6570", marginTop:8 }}>Redirecionando...</div>
          </>
        )}
        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  );
}