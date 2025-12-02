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
  - `W` ou `↑` ou `Espaço` - Pular
  - `S` ou `↓` ou `Ctrl` - Agachar/Interagir

- **Touch (Mobile):**
  - Botões virtuais na tela
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
- **Sistema de Stamina:** Barra de energia que afeta a velocidade
- **Casas Interiores:** Explore o interior das casas com mobília gerada
- **Sistema de Pontuação:** High scores salvos localmente
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
- Compita no ranking de high scores

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
