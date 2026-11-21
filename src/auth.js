import { supabase } from "./supabase.js";
const form=document.querySelector("#authForm"), loginTab=document.querySelector("#loginTab"), registerTab=document.querySelector("#registerTab"), usernameWrap=document.querySelector("#usernameWrap"), username=document.querySelector("#username"), email=document.querySelector("#email"), password=document.querySelector("#password"), submit=document.querySelector("#submitButton"), message=document.querySelector("#message");
let mode="login";
function setMode(value){mode=value;const reg=value==="register";loginTab.classList.toggle("active",!reg);registerTab.classList.toggle("active",reg);usernameWrap.hidden=!reg;username.required=reg;submit.textContent=reg?"Tạo tài khoản":"Đăng nhập";password.autocomplete=reg?"new-password":"current-password";message.textContent="";}
loginTab.addEventListener("click",()=>setMode("login"));registerTab.addEventListener("click",()=>setMode("register"));
form.addEventListener("submit",async e=>{e.preventDefault();submit.disabled=true;message.textContent="Đang xử lý...";
try{const mail=email.value.trim().toLowerCase(), pass=password.value;let result;
if(mode==="register"){const name=username.value.trim();if(!/^[a-zA-Z0-9_]{3,24}$/.test(name))throw new Error("Tên tài khoản cần 3-24 ký tự, chỉ gồm chữ không dấu, số hoặc dấu gạch dưới.");
result=await supabase.auth.signUp({email:mail,password:pass,options:{data:{username:name}}});if(result.error)throw result.error;message.textContent=result.data.session?"Đăng ký thành công.":"Đăng ký thành công. Hãy kiểm tra email để xác nhận.";if(result.data.session)location.href="/";
}else{result=await supabase.auth.signInWithPassword({email:mail,password:pass});if(result.error)throw result.error;const {data:profile,error}=await supabase.from("profiles").select("role").eq("id",result.data.user.id).single();if(error)throw error;location.href=profile.role==="admin"?"/admin.html":"/";}
}catch(err){message.textContent=err.message||"Có lỗi xảy ra.";}finally{submit.disabled=false;}});
