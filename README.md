# BullStock 🐂📦
Gerenciador de inventários e listas de compras compartilhadas em tempo real para equipes (100% em português do Brasil, tema vinho & dourado, zero dados pessoais).

---

## 🔐 1. Configuração de Autenticação Sem Dados Pessoais

O BullStock utiliza o provedor **E-mail/Senha** do Firebase Authentication nos bastidores, gerando e-mails fictícios (`<usuario>@usuarios.estoque.local`), garantindo que **nenhum e-mail real, telefone, foto ou dado pessoal seja solicitado ou armazenado**.

### Como Ativar Somente o Provedor E-mail/Senha no Firebase:
1. Acesse o [Firebase Console](https://console.firebase.google.com/) e selecione seu projeto.
2. No menu lateral, acesse **Build** > **Authentication**.
3. Se for a primeira vez, clique em **Começar (Get Started)**.
4. Na aba **Sign-in method (Método de login)**:
   - Clique em **E-mail/senha (Email/Password)**.
   - **Ative** a primeira chave: **E-mail/senha**.
   - Mantenha **Desativado** o "Link do e-mail (login sem senha)".
   - Clique em **Salvar**.
5. Certifique-se de que nenhum outro provedor (como Google, Facebook, etc.) esteja ativado.

---

## 👑 2. Como Configurar o Superadmin (`config/superadmins`)

O Superadmin possui privilégios totais: pode criar categorias, renomear, excluir, aprovar capitães e gerenciar quaisquer membros.

### Passo a passo para definir seu UID como Superadmin:
1. Cadastre-se normalmente no BullStock usando a tela de cadastro (escolha seu nome de usuário e senha).
2. Vá no [Firebase Console](https://console.firebase.google.com/) > **Authentication** > aba **Users**.
3. Localize o usuário que você acabou de criar (com o e-mail `<seu_usuario>@usuarios.estoque.local`) e **copie o UID do usuário** (coluna "Identificador de usuário").
4. No menu lateral do Firebase Console, vá em **Firestore Database**.
5. Clique em **Iniciar coleção** (ou navegue nas coleções se já existirem):
   - **Código da coleção**: `config`
   - Clique em **Avançar**.
   - **Código do documento**: `superadmins`
   - Adicione o campo:
     - **Nome do campo**: `uids`
     - **Tipo**: `array`
     - **Valor (item 0)**: cole o seu `UID` (ex: `A8xLq92m...`)
   - Clique em **Salvar**.
6. Pronto! Ao recarregar o app ou na aba de Perfil, você verá o selo dourado 👑 **Superadmin**.

*(Dica: se for a primeira inicialização do app e o Firestore ainda não tiver nenhuma coleção criada, você também pode clicar no botão **"Registrar Superadmin"** na aba **Perfil** enquanto estiver logado).*

---

## 🛡️ 3. Como Publicar as Regras de Segurança (`firestore.rules`)

As regras garantem isolamento estrito entre categorias, aprovação prévia pelo Capitão, criação de usuários com status pendente e proteção contra manipulação de papéis.

### Via Firebase Console:
1. No [Firebase Console](https://console.firebase.google.com/), acesse **Firestore Database** > aba **Regras (Rules)**.
2. Abra o arquivo local `firestore.rules` deste repositório, copie todo o seu conteúdo.
3. Cole no editor de regras do console.
4. Clique em **Publicar (Publish)**.

### Via Terminal (Firebase CLI):
```bash
firebase deploy --only firestore:rules
```

---

## 🧹 4. Migração e Limpeza de Dados do Modelo Anterior

Se você já possuía uma versão anterior do sistema com Grupos, Links de Convite e Login Google, siga este roteiro de limpeza no Firestore:

### Dados a serem APAGADOS no console do Firestore:
1. **Coleção `groups`**:
   - O modelo anterior armazenava grupos em `/groups/{groupId}` e convites em `/groups/{groupId}/invites`.
   - Pode apagar a coleção `groups` inteira ou migrar os inventários para `/categories/{categoryId}/inventories`.
2. **Coleção `invites`**:
   - Apague a coleção raiz `invites` (se existente), pois o sistema de códigos de convite foi substituído pelo fluxo de solicitações diretas.
3. **Coleção `users` (se continha dados pessoais)**:
   - Registros antigos que continham `email`, `displayName`, `photoURL` devem ser excluídos se desejar conformidade com a política Zero-PII.
   - O novo formato de `/users/{uid}` armazena estritamente `{ uid: string, username: string, createdAt: timestamp }`.
4. **Firebase Authentication**:
   - Se desejar remover os logins antigos com Google, acesse **Authentication** > **Users** e exclua as contas com provedor Google.

### Novo Modelo de Dados:
- `/users/{uid}`: `{ uid, username, createdAt }`
- `/config/superadmins`: `{ uids: ["UID1", "UID2"] }`
- `/categories/{catId}`: `{ name, description, color, createdAt, createdBy }`
- `/categories/{catId}/members/{uid}`: `{ uid, username, role ('capitao' | 'membro' | 'visualizador'), status ('pendente' | 'aprovado' | 'recusado'), requestedAt, approvedAt, approvedBy }`
- `/categories/{catId}/inventories/{invId}`: `{ name, description, createdAt, updatedAt }`
- `/categories/{catId}/inventories/{invId}/items/{itemId}`: `{ name, category, quantity, unit, minQuantity, location, notes, photo, updatedAt, updatedBy, updatedByUsername }`
- `/categories/{catId}/inventories/{invId}/items/{itemId}/history/{histId}`: `{ itemId, previousQuantity, newQuantity, delta, reason, userId, username, timestamp }`
- `/categories/{catId}/shoppingLists/{listId}`: `{ name, status, createdAt, createdByName, totalEstimated, totalPurchased }`
- `/categories/{catId}/shoppingLists/{listId}/items/{itemId}`: `{ name, quantity, unit, estimatedPrice, link, purchased, purchasedAt, purchasedBy, purchasedByUsername }`

---

## 🎨 Identidade Visual (BullStock)

- **Nome oficial**: BullStock
- **Paleta padrão (Dark Theme)**:
  - Fundo principal: `#3E0D1E` (Vinho escuro)
  - Superfície (cards, modais, barras): `#57182A`
  - Superfície elevada (inputs, destaques): `#5B1B2D`
  - Primária (botões principais, destaques, ícones): `#EDB23A` (Dourado)
  - Texto sobre primária: `#3E0D1E`
  - Texto principal: `#F0DCAF` (com contraste WCAG AA)
  - Alerta de estoque baixo: `#FF6B6B`
  - Sucesso / Comprado: `#7BC67E`
- **PWA & Ícones**:
  - `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `favicon.png`
  - `manifest.webmanifest` com `theme_color: #3E0D1E` e display `standalone`.
