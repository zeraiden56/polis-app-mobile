# Release Readiness — Google Play (AAB / EAS)

Checklist e bloqueadores para publicar o Polis Ponto na Google Play com AAB via EAS Build. Auditoria completa no plano em `.cursor/plans/` ou no histórico da auditoria App Store / Play Store.

---

## A) Bloqueadores para publicar

1. **Política de privacidade** — O app já usa `PRIVACY_POLICY_URL = "https://mgtparticipacoes.com.br/politica-de-privacidade"`. Publicar a página nessa URL e informar a mesma URL no campo "Privacy policy" da Play Console (e App Store).
2. **Link na ficha** — Na página do app na Play Console, o campo "Privacy policy" é obrigatório; usar a URL acima.

---

## B) Recomendado antes de enviar

- Incrementar `android.versionCode` em `app.json` a cada novo upload.
- Preencher **Data safety** (localização, fotos, dados de conta; finalidade: funcionalidade do app).
- Confirmar credencial de assinatura Android no EAS para `com.polis.ponto`.
- Garantir que `.env` não está commitado (já está no `.gitignore`).

---

## C) Checklist Play Console (M5 — o que preencher)

- **App content**
  - **Privacy policy:** `https://mgtparticipacoes.com.br/politica-de-privacidade` (mesma URL do app).
  - **App access:** informar como obter acesso (ex.: login com CPF/senha fornecido pelo empregador).
  - **Ads:** declarar que o app não contém anúncios.
- **Data safety**
  - Dados coletados: localização (precisa, no momento da batida), fotos/vídeos (selfie de ponto, avatar, anexos), informações da conta (identificador, nome, e-mail).
  - Finalidade: "Funcionalidade do app" / registro de ponto / verificação de identidade e local.
  - Segurança: dados em trânsito criptografados (HTTPS); token no dispositivo (SecureStore).
- **Conteúdo:** Faixa etária (ex.: "Para todos"); questionário sobre câmera e localização (registro de ponto).
- **Data deletion:** na política de privacidade (e na ficha se a Play exigir): como o usuário solicita exclusão de dados (ex.: contato com RH ou e-mail do DPO).
- **Produção:** build com `eas build --platform android --profile production` (AAB). Não usar profile `preview` (APK) para a loja.

---

## Localização em background (crítico)

- **Verificado:** O app usa apenas `requestForegroundPermissionsAsync()` e `getCurrentPositionAsync()` no fluxo "Bater ponto" (`HomeScreen.tsx`). Plugin `expo-location` em `app.json` não define `isAndroidBackgroundLocationEnabled`, portanto **não** é adicionada `ACCESS_BACKGROUND_LOCATION`. Sem risco de rejeição por localização em background.

---

## Plano de ação (resumido)

1. Publicar a política de privacidade em `https://mgtparticipacoes.com.br/politica-de-privacidade` (o app já aponta para essa URL).
2. Play Console: preencher Privacy policy (URL acima), Data safety (ver seção C acima), App access, Ads (nenhum), Conteúdo, Data deletion.
3. EAS: confirmar credencial de assinatura Android para `com.polis.ponto`.
4. Build: `eas build --platform android --profile production`.
5. Upload do AAB na Play Console; incrementar `versionCode` em `app.json` a cada novo release.
