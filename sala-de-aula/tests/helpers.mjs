// Ajudantes dos testes: entrar (ou fazer o primeiro acesso) e abrir/criar uma sala.
export const ADMIN = { nome: 'Rubens', usuario: 'rubens', senha: 'segredo1' };

export async function entrar(page, app, cred = ADMIN) {
  await page.goto(app);
  await page.locator('#usuario, .portal-bar').first().waitFor();
  if (await page.locator('#usuario').count()) {
    if (await page.getByText('Primeiro acesso').count()) await page.locator('#nome').fill(cred.nome);
    await page.locator('#usuario').fill(cred.usuario);
    await page.locator('#senha').fill(cred.senha);
    await page.getByRole('button', { name: /Entrar|Criar conta e entrar/ }).click();
  }
  await page.locator('.portal-bar').waitFor();
}

/** Abre a sala (criando se não existir) e deixa a área "Adicionar material" visível. */
export async function abrirSala(page, nome) {
  await page.getByRole('button', { name: 'Minhas salas', exact: true }).click();
  await page.locator('.portal-title h1').waitFor();
  const card = page.locator('.sala-card', { hasText: nome });
  await page.waitForTimeout(300);
  if (await card.count()) await card.locator('.sala-abrir').click();
  else {
    await page.getByRole('button', { name: '+ Nova sala' }).click();
    await page.locator('#sala-nome').fill(nome);
    await page.getByRole('button', { name: 'Criar sala' }).click();
  }
  await page.locator('.portal-title h1', { hasText: nome }).waitFor();
  if (await page.getByRole('button', { name: '+ Adicionar material' }).count()) await page.getByRole('button', { name: '+ Adicionar material' }).click();
  await page.getByText('Adicionar material à sala').waitFor();
}
