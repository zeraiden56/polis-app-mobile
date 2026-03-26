<p align="center">
  <img src="assets/adaptive-icon.png" alt="Polis Gestão e Tecnologia" width="200" />
</p>

<h1 align="center">Polis Ponto</h1>

<p align="center">
  Aplicativo mobile de <strong>registro de ponto eletrônico</strong> para funcionários.<br/>
  Batida com selfie e geolocalização, espelho de ponto, justificativas com anexos e perfil — tudo com autenticação biométrica opcional.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Expo-54-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo" />
  <img src="https://img.shields.io/badge/React_Native-0.81-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React Native" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/NativeWind-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="NativeWind" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React_Navigation-7-6B52AE?style=for-the-badge&logo=react&logoColor=white" alt="React Navigation" />
  <img src="https://img.shields.io/badge/EAS_Build-16+-000020?style=for-the-badge&logo=expo&logoColor=white" alt="EAS Build" />
  <img src="https://img.shields.io/badge/Node.js-≥18-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Android-APK_|_AAB-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Android" />
  <img src="https://img.shields.io/badge/iOS-App_Store-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iOS" />
</p>

---

## Sumário

- [Arquitetura do Projeto](#arquitetura-do-projeto)
- [Estrutura de Pastas](#estrutura-de-pastas)
- [Telas e Navegação](#telas-e-navegação)
- [Fluxo de Autenticação](#fluxo-de-autenticação)
- [Integração com API](#integração-com-api)
- [Serviços Auxiliares](#serviços-auxiliares)
- [Configuração de Ambiente](#configuração-de-ambiente)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Build e Lançamento (iOS e Android)](#build-e-lançamento-ios-e-android)
- [Publicação nas Lojas](#publicação-nas-lojas)

---

## Arquitetura do Projeto

```
App.tsx
  └── AuthProvider (Context)
        └── AppNavigator (Stack Navigator)
              ├── Login / ChangePassword   ← sem autenticação / senha expirada
              └── Home / Telas internas    ← autenticado
```

- **Gerenciamento de estado:** React Context (`AuthContext`) + hooks (`useAuth`)
- **Persistência local:** `expo-secure-store` (token, dados sensíveis) + `AsyncStorage` (preferências, fila offline)
- **Estilização:** NativeWind 4 (classes Tailwind) + `StyleSheet` nativo
- **Navegação:** `@react-navigation/native-stack` — stack único, sem tab bar

---

## Estrutura de Pastas

```
polis-app/
├── App.tsx                        # Raiz: AuthProvider + AppNavigator
├── index.ts                       # Registro do componente raiz (Expo)
├── global.css                     # Diretivas Tailwind (NativeWind)
├── app.json                       # Configuração Expo
├── eas.json                       # Configuração EAS Build/Submit
├── plugins/
│   └── withPhoneOnly.js           # Config plugin — restringe a celulares
│
└── src/
    ├── api/
    │   ├── config.ts              # BASE_URL, API_URL, helpers
    │   ├── auth.ts                # Login, /me, troca de senha
    │   ├── ponto.ts               # Batida, espelho, justificativas, alocação
    │   └── profile.ts             # Perfil e avatar
    │
    ├── components/
    │   ├── AppDialog.tsx           # Modal de feedback (sucesso/erro/info)
    │   ├── PolisButton.tsx         # Botão com variantes
    │   ├── PolisCard.tsx           # Card com sombra
    │   └── PolisInput.tsx          # Input com label e validação
    │
    ├── contexts/
    │   └── AuthContext.tsx          # Provider de autenticação global
    │
    ├── hooks/
    │   └── useAuth.ts              # Hook de acesso ao AuthContext
    │
    ├── navigation/
    │   └── AppNavigator.tsx        # Stack Navigator com rotas condicionais
    │
    ├── screens/
    │   ├── LoginScreen.tsx          # Login por CPF + senha (+ biometria)
    │   ├── ChangePasswordScreen.tsx # Troca de senha obrigatória
    │   ├── HomeScreen.tsx           # Dashboard — batida de ponto
    │   ├── TimesheetScreen.tsx      # Espelho mensal de ponto
    │   ├── JustificationFormScreen.tsx # Formulário de justificativa
    │   ├── JustificationsScreen.tsx # Lista de justificativas enviadas
    │   ├── ProfileScreen.tsx        # Dados do perfil + avatar
    │   ├── SettingsScreen.tsx       # Biometria, lembretes, privacidade
    │   └── SelfiesDiaScreen.tsx     # Selfies de um dia específico
    │
    ├── services/
    │   ├── pontoQueue.ts           # Fila offline para batidas
    │   └── notifications.ts        # Lembretes de expediente
    │
    └── theme/
        └── colors.ts               # Paleta de cores do app
```

---

## Telas e Navegação

| Rota               | Tela                       | Descrição                                  |
| ------------------- | -------------------------- | ------------------------------------------ |
| `Login`             | LoginScreen                | CPF + senha, opção "lembrar", biometria    |
| `ChangePassword`    | ChangePasswordScreen       | Troca obrigatória no primeiro acesso       |
| `Home`              | HomeScreen                 | Dashboard com botão de batida + selfie     |
| `FolhaPonto`        | TimesheetScreen            | Espelho mensal com dias e horários         |
| `JustificarBatida`  | JustificationFormScreen    | Envio de justificativa com anexo           |
| `Justificativas`    | JustificationsScreen       | Histórico de justificativas                |
| `Perfil`            | ProfileScreen              | Dados pessoais e foto de perfil            |
| `Config`            | SettingsScreen             | Biometria, lembretes, política de privacidade |
| `SelfiesDia`        | SelfiesDiaScreen           | Selfies registradas em uma data            |

**Regras de exibição:**
- Sem token → apenas `Login`
- Logado com `must_change_password` → apenas `ChangePassword`
- Logado e senha OK → `Home` + todas as telas internas

---

## Fluxo de Autenticação

1. **Login manual:** CPF (mascarado) + senha → `POST /auth/employee/login` → token salvo em SecureStore
2. **"Lembrar-me":** grava token + dados do usuário no SecureStore para sessões futuras
3. **Biometria:** se há sessão salva e biometria ativada nas configurações, autentica com Face ID / impressão digital antes de restaurar a sessão
4. **Troca de senha obrigatória:** se `must_change_password === true`, redireciona para `ChangePassword`
5. **Logout:** limpa SecureStore (`auth_token`, `auth_user`)

---

## Integração com API

Toda comunicação é feita via `fetch` nativo com Bearer token.

| Módulo        | Endpoints principais                                              |
| ------------- | ----------------------------------------------------------------- |
| **auth.ts**   | `POST /auth/employee/login`, `GET /v1/me`, `POST /auth/employee/change-password` |
| **ponto.ts**  | `POST /v1/ponto/bater` (multipart), `GET /v1/ponto/hoje`, `GET /v1/ponto/espelho`, `GET /v1/ponto/alocacao-atual`, `POST /v1/ponto/eventos`, `GET /v1/ponto/eventos` |
| **profile.ts**| `GET /v1/ponto/profile`, `POST /v1/ponto/profile/avatar`          |

A URL base é definida por variável de ambiente (`EXPO_PUBLIC_API_URL`) e varia por perfil EAS:

| Perfil EAS     | URL da API                                    |
| -------------- | --------------------------------------------- |
| `development`  | `https://grupomgparticipacoes.com.br/api`     |
| `preview`      | `https://grupomgparticipacoes.com.br/api`     |
| `production`   | `https://mgtparticipacoes.com.br/api`         |

---

## Serviços Auxiliares

### Fila Offline (`pontoQueue.ts`)
Quando o dispositivo está sem conexão, as batidas de ponto são enfileiradas em `AsyncStorage` (`ponto_queue_v1`). Ao retornar a conectividade, `flushQueue` envia as batidas pendentes em ordem, descartando erros de validação para não travar a fila.

### Notificações Locais (`notifications.ts`)
Lembretes diários de expediente baseados no horário da alocação atual (`apiAlocacaoAtual`) ou perfil. Desabilitados automaticamente dentro do Expo Go.

---

## Configuração de Ambiente

### Pré-requisitos

- **Node.js** ≥ 18
- **npm** ou **yarn**
- **EAS CLI** ≥ 16 (`npm install -g eas-cli`)
- **Expo Go** no celular (para desenvolvimento) ou dev client

### Variáveis de Ambiente

| Variável                | Descrição                     |
| ----------------------- | ----------------------------- |
| `EXPO_PUBLIC_API_URL`   | URL base da API REST          |

Configuradas automaticamente por perfil no `eas.json`.

---

## Como Rodar Localmente

```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npx expo start

# Rodar no Android (emulador ou dispositivo)
npx expo run:android

# Rodar no iOS (simulador — apenas macOS)
npx expo run:ios
```

Para usar o **Expo Go**, basta escanear o QR code que aparece no terminal.

---

## Build e Lançamento (iOS e Android)

### Configuração inicial do EAS

```bash
# Instalar EAS CLI globalmente
npm install -g eas-cli

# Fazer login na conta Expo
eas login

# Verificar que o projeto está vinculado (projectId no app.json)
eas whoami
```

### Android

#### APK de teste interno (preview)

```bash
eas build --platform android --profile preview
```

Gera um `.apk` para instalação direta. Útil para testes internos e QA.

#### AAB de produção (Google Play)

```bash
# Gerar o bundle de produção
eas build --platform android --profile production
```

Isso gera um `.aab` (Android App Bundle) otimizado para a Google Play.

#### Enviar para a Google Play

```bash
# Submeter automaticamente via EAS Submit
eas submit --platform android --profile production
```

> **Primeiro envio:** é necessário criar o app manualmente no [Google Play Console](https://play.google.com/console), configurar a ficha da loja (ícones, descrição, screenshots, política de privacidade) e fazer o primeiro upload manual do AAB. Após isso, `eas submit` funciona automaticamente.

**Passo a passo do primeiro envio manual:**

1. Acesse o [Google Play Console](https://play.google.com/console)
2. Crie um novo aplicativo com o package name `com.polis.ponto`
3. Preencha a ficha da loja (título, descrição, ícones, screenshots)
4. Vá em **Produção → Criar nova versão**
5. Faça upload do `.aab` gerado pelo EAS
6. Preencha as notas de versão e envie para revisão

### iOS

#### Build de desenvolvimento

```bash
eas build --platform ios --profile development
```

#### Build de produção (App Store)

```bash
eas build --platform ios --profile production
```

> **Requisitos:** conta Apple Developer ($99/ano), certificados e provisioning profiles gerenciados automaticamente pelo EAS.

#### Enviar para a App Store

```bash
eas submit --platform ios --profile production
```

**Passo a passo do primeiro envio:**

1. Acesse o [App Store Connect](https://appstoreconnect.apple.com)
2. Crie um novo app com o bundle ID `com.polis.ponto`
3. Preencha metadados (nome, descrição, screenshots, ícone, categoria)
4. Adicione a URL da política de privacidade
5. Após o `eas submit`, o build aparecerá no TestFlight para testes
6. Quando aprovado no TestFlight, envie para revisão da App Store

### Build para ambas as plataformas de uma vez

```bash
eas build --platform all --profile production
```

---

## Publicação nas Lojas

### Checklist pré-publicação

- [ ] Testar todas as funcionalidades no build de preview/TestFlight
- [ ] Verificar que a `EXPO_PUBLIC_API_URL` de produção está correta
- [ ] Preparar ícones e screenshots nas resoluções exigidas
- [ ] Redigir descrição da loja e notas da versão
- [ ] Configurar política de privacidade (URL pública)
- [ ] Revisar permissões solicitadas (câmera, localização, biometria)

### Atualizações OTA (Over-the-Air)

Para atualizações de código JS sem precisar de novo build nativo:

```bash
# Publicar atualização OTA
eas update --branch production --message "Descrição da atualização"
```

> Atualizações OTA não permitem alterar código nativo, permissões ou dependências com módulos nativos. Para essas mudanças, é necessário um novo build completo.

---

## Licença

Uso interno — todos os direitos reservados.
