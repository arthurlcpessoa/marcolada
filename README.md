# Pelada Stats Hub

Crie uma aplicação web responsiva chamada Marcolada Stats, destinada ao registro de estatísticas em tempo real de uma pelada entre amigos.

A aplicação deve ter um visual moderno, limpo e profissional, sem aparência genérica de projeto feito por inteligência artificial. Utilize principalmente as cores branco e azul, com boa hierarquia visual, espaços bem distribuídos, ícones discretos, bordas suaves e tipografia moderna.

A aplicação precisa funcionar perfeitamente em:

Celulares;

Tablets;

Computadores.

A experiência no celular deve ser prioridade, pois a maior parte dos registros será feita durante os jogos.

Objetivo da aplicação

Permitir que os participantes cadastrem os jogadores presentes no dia, criem os times, registrem gols e assistências durante cada partida e acompanhem, em tempo real, os destaques da pelada.

Ao final, a aplicação deve mostrar:

Artilheiro da pelada;

Garçom, jogador com mais assistências;

Jogador com mais participações em gols;

Time com mais vitórias;

Time com mais gols marcados;

Resultados de todas as partidas;

Estatísticas individuais de cada jogador.

Estrutura da aplicação

Crie as seguintes páginas ou etapas:

1. Tela inicial

Exiba:

Nome e identidade visual da Marcolada;

Botão “Nova pelada”;

Botão “Continuar pelada” quando existir uma pelada em andamento;

Histórico das peladas anteriores;

Resumo dos recordes gerais, como maior artilheiro e maior assistente.

A tela inicial deve ser simples, bonita e fácil de entender.

2. Cadastro da pelada

Ao iniciar uma nova pelada, solicitar:

Data da pelada, preenchida automaticamente com a data atual;

Nome ou edição da pelada, por exemplo: “Marcolada – 06/08/2026”;

Local, como campo ou arena;

Duração estimada;

Formato dos jogos, como quantidade de jogadores por time;

Limite de gols ou duração de cada partida.

Permita que esses campos sejam opcionais, com exceção do nome e da data.

3. Cadastro dos jogadores

Permita cadastrar os jogadores presentes no dia.

Cada jogador deve possuir:

Nome;

Apelido opcional;

Foto opcional;

Posição opcional;

Número da camisa opcional.

Também deve existir uma lista de jogadores já cadastrados anteriormente, permitindo selecioná-los rapidamente sem precisar cadastrá-los novamente.

Disponibilize:

Campo de pesquisa;

Seleção múltipla;

Botão para adicionar novo jogador;

Botão para remover um jogador da pelada atual;

Indicação da quantidade total de jogadores selecionados.

4. Criação dos times

Permita criar os times que participarão da pelada.

Cada time deve ter:

Nome;

Cor;

Lista de jogadores;

Capitão opcional.

O usuário deve poder:

Distribuir jogadores manualmente;

Arrastar jogadores entre os times;

Gerar times automaticamente;

Editar o nome e a cor dos times;

Salvar diferentes formações ao longo da pelada.

Os jogadores podem mudar de time entre uma partida e outra. As estatísticas individuais devem continuar vinculadas ao jogador, independentemente do time em que ele estiver.

5. Tela de partida em andamento

Essa deve ser a principal tela da aplicação.

Exiba no topo:

Nome dos dois times;

Placar atual;

Cronômetro opcional;

Número da partida;

Status da partida: em andamento, pausada ou encerrada.

O placar deve ser grande, visível e fácil de ler.

Crie botões grandes e fáceis de tocar para:

Registrar gol;

Desfazer última ação;

Encerrar partida;

Pausar ou continuar cronômetro;

Editar placar manualmente.

Registro de gol e assistência

Ao clicar em “Registrar gol”, abrir um fluxo rápido:

Selecionar o time que marcou;

Selecionar o jogador que fez o gol;

Selecionar quem deu a assistência;

Confirmar o lance.

A assistência deve ser opcional.

Também disponibilize as opções:

Gol sem assistência;

Gol contra;

Editar o horário do gol;

Cancelar registro.

Após a confirmação:

Atualizar o placar automaticamente;

Atualizar as estatísticas dos jogadores;

Atualizar o dashboard em tempo real;

Mostrar uma pequena confirmação visual com o nome do autor do gol.

O processo inteiro deve exigir poucos toques, para facilitar o uso durante a partida.

6. Histórico de lances

Na mesma tela da partida, exiba uma linha do tempo com:

Autor do gol;

Assistente;

Time;

Momento do gol;

Placar após o lance.

Cada lance deve possuir opções para:

Editar;

Excluir;

Corrigir jogador;

Corrigir assistência.

Ao editar ou excluir um lance, todas as estatísticas e o placar devem ser recalculados automaticamente.

7. Encerramento da partida

Ao encerrar uma partida, registrar:

Placar final;

Time vencedor;

Jogadores de cada time;

Gols;

Assistências;

Horário ou duração da partida.

Depois, permitir:

Iniciar nova partida;

Repetir os mesmos times;

Editar as escalações;

Criar novos times;

Encerrar a pelada completa.

Dashboard em tempo real

Crie um dashboard visual que seja atualizado automaticamente durante a pelada.

O dashboard deve possuir cards com:

Artilheiro atual;

Garçom atual;

Jogador com mais participações em gols;

Time com mais vitórias;

Time com mais gols marcados;

Total de gols;

Total de partidas;

Média de gols por partida.

Crie também rankings em formato de tabela ou cards.

Ranking de jogadores

Exibir:

Posição no ranking;

Nome;

Foto ou iniciais;

Gols;

Assistências;

Participações em gols;

Partidas disputadas;

Vitórias;

Aproveitamento.

Permita ordenar por:

Gols;

Assistências;

Participações em gols;

Vitórias;

Aproveitamento.

Ranking dos times

Exibir:

Nome do time;

Jogos;

Vitórias;

Empates;

Derrotas;

Gols marcados;

Gols sofridos;

Saldo de gols;

Aproveitamento.

O “melhor time” da pelada deve ser definido primeiramente pelo número de vitórias. Em caso de empate, utilizar nesta ordem:

Saldo de gols;

Gols marcados;

Confronto direto;

Menor número de gols sofridos.

8. Resumo final da pelada

Ao encerrar a pelada, exiba uma tela de premiação com destaque visual para:

Artilheiro;

Garçom;

Líder em participações em gols;

Melhor time;

Partida com mais gols;

Placar mais elástico.

Exiba também:

Ranking final dos jogadores;

Ranking final dos times;

Resultados de todas as partidas;

Total de gols;

Total de assistências;

Média de gols por partida;

Duração total da pelada.

Inclua um botão para gerar e compartilhar uma imagem com o resumo final da Marcolada, em formato adequado para WhatsApp e Instagram Stories.

A arte compartilhável deve utilizar as cores branco e azul e apresentar:

Nome da Marcolada;

Data;

Artilheiro;

Garçom;

Melhor time;

Placar das partidas;

Logo ou identidade visual da aplicação.

9. Histórico geral

Crie uma área para consultar peladas anteriores.

Permita filtrar por:

Data;

Jogador;

Time;

Local.

Crie também rankings históricos da Marcolada:

Maiores artilheiros;

Maiores assistentes;

Jogadores com mais partidas;

Jogadores com mais vitórias;

Melhores aproveitamentos;

Times com mais vitórias.

Ao abrir uma pelada antiga, mostrar todos os jogadores, times, partidas e estatísticas daquele dia.

Regras importantes

Um jogador pode participar de diferentes times durante a mesma pelada.

Gols e assistências devem ser registrados individualmente.

Cada partida deve armazenar a formação dos times utilizada naquele momento.

Ao excluir ou editar um gol, os rankings devem ser recalculados automaticamente.

O sistema deve impedir que um jogador do time adversário seja selecionado como assistente.

O sistema deve confirmar antes de excluir uma partida ou encerrar a pelada.

Deve existir uma função de desfazer a última ação.

A aplicação deve salvar automaticamente os dados para evitar perda caso a página seja fechada ou atualizada.

Uma pelada em andamento deve poder ser retomada posteriormente.

Evite formulários grandes durante a partida.

Priorize botões grandes, seletores rápidos e poucos cliques.

Não utilize dados fictícios fixos na versão final.

Crie estados vazios bem desenhados para telas sem jogadores, partidas ou estatísticas.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://marcolada.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/739624e3-e219-4bc6-9082-377b7e6aabeb).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
