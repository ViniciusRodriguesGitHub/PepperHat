# Pepper Hat Game

Um jogo de plataforma minimalista desenvolvido em JavaScript puro, sem dependências externas.

## 📁 Estrutura do Projeto

```
game/
├── assets/                    # Recursos do jogo
│   └── images/               # Imagens organizadas por categoria
│       ├── player/           # Sprites do jogador
│       │   ├── pepper.png
│       │   ├── pepper_idle_*.png
│       │   ├── pepper_walk_*.png
│       │   ├── wk*.png       # Frames de caminhada
│       │   ├── 1subindo.png  # Animação de pulo (subindo)
│       │   ├── 2desacelerando.png  # Animação de pulo (desacelerando)
│       │   ├── 3caindo.png   # Animação de pulo (caindo)
│       │   ├── parado.png    # Sprite parado
│       │   ├── paradoLado.png
│       │   └── l0_abaixar*.png  # Frames de agachamento
│       ├── environment/      # Elementos do ambiente
│       │   ├── ground_tile.png
│       │   └── city_background.png
│       ├── collectibles/     # Itens coletáveis
│       │   ├── note.png
│       │   └── record.png
│       └── ui/              # Elementos de interface (futuro)
├── css/                     # Estilos CSS
│   └── style.css
├── js/                      # Código JavaScript
│   └── game.js             # Lógica principal do jogo
├── libs/                    # Bibliotecas externas
│   └── phaser.min.js       # (não utilizado atualmente)
├── index.html              # Página principal
└── README.md               # Este arquivo
```

## 🎮 Como Jogar

### Controles
- **Teclado:**
  - `A` ou `←` - Mover para esquerda
  - `D` ou `→` - Mover para direita
  - `D` + `S` (agachado) - Sprint (consome estamina)
  - `W` ou `↑` ou `Espaço` - Pular (segure para pulo mais alto)
  - `S` ou `↓` ou `Ctrl` - Agachar/Interagir

### Física Realista
- **Gravidade:** 980 pixels/s² (mais realista)
- **Velocidade Terminal:** Limitação máxima de queda
- **Resistência do Ar:** Atrito no ar durante saltos
- **Atrito no Chão:** Desaceleração natural no solo
- **Pulo Variável:** Segure para pular mais alto
- **Wall Sliding/Jumping:** Escorregue pelas paredes e pule delas

- **Touch (Mobile):**
  - Botões virtuais na tela

### Itens Colecionáveis
- 🎵 **Nota Musical** - Item comum (+1 ponto)
- 💿 **Disco de Vinil** - Item comum (+1 ponto)
- 🎵 **Nota Dourada** - Raro (+2 pontos + velocidade temporária)
- 💎 **Cristal de Energia** - Raro (estamina completa)
- ⚡ **Boost de Velocidade** - Raro (+30% velocidade por 8s)
- 🎁 **Caixa Misteriosa** - Ultra raro (efeito aleatório)
  - Toque na metade esquerda da tela para agachar
  - Toque na metade direita da tela para pular

- **Gamepad:**
  - D-pad ou analógico esquerdo para movimento
  - Botão A para pular
  - Botão B para agachar

### Modos de Jogo
1. **Easy** - Modo fácil (sem inimigos)
2. **Normal** - Modo normal (com inimigos)
3. **Inclination** - Controle por inclinação do dispositivo
4. **Lock Right** - Movimento forçado para direita

## 🚀 Funcionalidades

- **Sistema de Animações:** Sprites animados para idle, caminhada, pulo e agachamento
- **Geração Procedural:** Mundo infinito com objetos gerados dinamicamente
- **Sistema de Coleta:** Notas musicais e discos de vinil para coletar
- **Física Realista:** Gravidade, colisões e plataformas
- **Sistema de Sprint:** Barra de energia que permite velocidade dobrada ao correr agachado
- **Power Jump:** Pulo com aceleração horizontal quando a barra vermelha está cheia
- **Plataformas de Speed Boost:** Plataformas douradas que dão impulso extra temporário
- **Caixas Quebráveis:** Caixas marrons que se quebram ao pular em cima, podendo soltar itens
- **Sistema de Quests:** Missões progressivas que dão propósito ao jogo e recompensas
- **Dificuldade Adaptativa:** Ajusta automaticamente a dificuldade baseada no desempenho do jogador
- **Efeitos Visuais Avançados:** Partículas, screen shake, flash effects para feedback imersivo
- **Object Pooling:** Sistema de reutilização de objetos para melhor performance
- **Casas Interiores:** Explore o interior das casas com mobília gerada
- **Sistema de Pontuação:** High scores salvos localmente

## 🏢 Prédios Especiais

O jogo agora inclui vários tipos de prédios com funcionalidades únicas:

### 🏥 Hospital
- **Função:** Restaura completamente a estamina do jogador
- **Visual:** Prédio branco com cruz vermelha
- **Ação:** Entre para curar ferimentos

### 🚒 Bombeiros
- **Função:** Boost de velocidade temporário (+50% por 15 segundos)
- **Visual:** Prédio vermelho com caminhão de bombeiros
- **Ação:** Entre para ganhar velocidade extra

### 🛒 Loja
- **Função:** Gera 3 itens coletáveis extras
- **Visual:** Prédio amarelo com sinal de "SHOP"
- **Ação:** Entre para encontrar itens

### 🏪 Supermercado
- **Função:** Gera 8 itens coletáveis extras
- **Visual:** Prédio verde com sinal de "SUPERMARKET"
- **Ação:** Entre para grande quantidade de itens

**Nota:** O jogador sempre entra em todos os prédios através da porta, sendo posicionado corretamente na entrada interna do prédio.
- **Responsivo:** Funciona em desktop e mobile

## 🛠️ Tecnologias Utilizadas

- **HTML5 Canvas** - Renderização gráfica
- **JavaScript ES6+** - Lógica do jogo
- **CSS3** - Estilos e responsividade
- **Web APIs** - Device Orientation, Gamepad, Touch Events

## 📱 Compatibilidade

- ✅ Desktop (Chrome, Firefox, Safari, Edge)
- ✅ Mobile (iOS Safari, Android Chrome)
- ✅ Tablets
- ✅ Gamepads (Xbox, PlayStation, etc.)

## 🎯 Objetivos do Jogo

- Colete o máximo de itens possível
- Evite os inimigos roxos
- Explore casas e interiores
- Alcance a maior distância possível
- Complete missões progressivas
- Compita no ranking de high scores

## 📋 Sistema de Quests

O jogo inclui um sistema de missões progressivas que guiam o jogador através de diferentes objetivos:

1. **Bem-vindo ao Pepper Hat!** - Colete 5 itens musicais
2. **Explorador** - Entre em 3 casas diferentes
3. **Corredor Veloz** - Use o sprint 10 vezes
4. **Sobrevivente** - Alcance 2000 metros de distância
5. **Colecionador** - Colete 20 itens no total

Cada missão concluída oferece recompensas como bônus de estamina, velocidade temporária ou mensagens de incentivo.

### 📋 Lista Completa de Missões

1. **Bem-vindo ao Pepper Hat!** - Colete 5 notas musicais
2. **Explorador** - Entre em 3 casas diferentes (+50% estamina)
3. **Corredor Veloz** - Use sprint 10 vezes (+20% velocidade)
4. **Caçador de Prédios** - Visite 2 tipos diferentes de prédios especiais
5. **Curandeiro** - Visite um hospital (+100% estamina)
6. **Demônio da Velocidade** - Visite um bombeiro (+30% velocidade)
7. **Comprador** - Visite uma loja (+75% estamina)
8. **Sobrevivente** - Alcance 2000 metros de distância
9. **Colecionador** - Colete 20 itens no total (+100% estamina)
10. **Mestre Explorador** - Visite todos os tipos de prédios (🏆 CONQUISTA FINAL!)

## 🎯 Dificuldade Adaptativa

O jogo monitora seu desempenho e ajusta automaticamente a dificuldade:

- **Taxa de Sobrevivência:** Distância percorrida por morte
- **Taxa de Coleta:** Itens coletados por minuto
- **Taxa de Exploração:** Casas visitadas por minuto

Com base nessas métricas, o jogo ajusta:
- Velocidade dos inimigos
- Frequência de objetos coletáveis
- Drenagem de estamina
- Potência do pulo

O sistema classifica seu nível de habilidade como:
- **Iniciante:** Facilitando sua jornada
- **Intermediário:** Desafiando suas habilidades
- **Avançado:** Para mestres do Pepper Hat

## 🔧 Desenvolvimento

### Estrutura do Código
- **GameConfig** - Configurações centralizadas
- **Sistema de Estados** - Menu, Jogando, Game Over
- **Sistema de Input** - Suporte a múltiplos controles
- **Sistema de Física** - Gravidade e colisões
- **Sistema de Renderização** - Canvas 2D com zoom e parallax

### Melhorias Futuras Sugeridas
- [ ] Adicionar mais tipos de inimigos
- [ ] Sistema de power-ups
- [ ] Múltiplos níveis/ambientes
- [ ] Efeitos sonoros e música
- [ ] Sistema de save/load
- [ ] Multiplayer local
- [ ] Mais animações e efeitos visuais

## 📄 Licença

Este projeto é de código aberto e pode ser usado livremente para fins educacionais e comerciais.

---

**Desenvolvido com ❤️ usando JavaScript puro**
