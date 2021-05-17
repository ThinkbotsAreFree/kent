# kent



## syntaxe

préfixée façon logo

parenthèses pour grouper

virgule ignorée

exemple :
f1 prend 2 arguments

```
f1 a1 a2
```

l'un des arguments peut être une liste

```
f1 (a11 a12) a2
```



## sémantique

sequence et select des behavior trees

patterns récursifs

`while` et `until` (versions loop de sequence et select)

select = goal

emotion

sequence = procedure

`seq` et `goal`

`fun` comme constructeur de fonctions



### Icon

```
as enter fun (house) goal (
  seq (open door, get_in house)
  seq (open window, get_in house)
)

play enter home



as locate fun (s)
  while as line read, seq (
    if find s line
    write line
  )


as locate fun (s) seq (
  as lineno 0
  while as line read, seq (
    as lineno add lineno 1
    if find s line
    write (lineno ": " line)
  )
)
```
**page 8**

```
as countm fun (s) seq (

  as count 0
  while as line read, seq (
    if match s line
    incr count
  )
  up count
)
```

**page 19**

```
as s1 "_ _ _ x _ _ x _ x _ "
as s2 "x"

if gt find s1 s2 10 write "good"
```

afficherait `good`

**page 20**

```
every as i find s1 s2 write i
```

**page 21**

```
if eq i or (0 1)
write "ok"

every as i or (0 1)
write i

if find s1 and (s2 s3)
write "ok"
```

**page 31**

```
as from-to fun (start end) seq (

  as i start
  while lte i end, seq (
    next i
    incr i
  )  
)
```



### Dekorte's Io



#### contrôle

on veut pouvoir implémenter des structures de contrôle

les expressions doivent pouvoir être évaluées manuellement

`ctrl` à la place de `fun` pour les contrôles

```
as my-ife ctrl (condition if-true if-false) goal (

  seq (
    if eval condition
    seq (eval if-true, up)
  )
  seq (
    if not eval condition
    seq (eval if-false, up)
  )
)
```



#### code litéral

du coup on créé un litéral pour le code

```
write 'add 1 1
```

affichera `add 1 1`

le 1er élément est quoté, l'arité est respectée.




#### objets

`/` ou `of` pour accéder à un slot

```
as Malcom/age 15

as info "age"
write of Malcom info

```



#### délégation

`has` et `isa` sont des slots spéciaux

* `has` est une liste de composants
* `isa` est une liste de prototypes

lors d'une délégation :

* `this` représente l'exécutant pour un composant 
* `this` représente le receveur pour un prototype



### Eno

tout programme est intégré dans un document **Eno**

le contenu de la section est accessible comme variable

```
# demo

  x: 5
  y: 6
  
  show-sum: fun () write add x y

  L: (1 2 3)

  L:
  - 1
  - 2
  - 3

  O: { x 1, y 2, z 3 }

  O:
  x = 1
  y = 2
  z = 3
```

les sous-sections sont accessibles comme objets

```
# demo

  show-sum: fun () write add subsection/x subsection/y

  ## subsection
  
    x: 5
    y: 6
  
```

les sections soeurs aussi, toujours en syntaxe filesystem

```
# demo

  ## main
  
    show-sum: fun () write add ../sibling/x ../sibling/y
  
  ## sibling
  
    x: 5
    y: 6  
```



### BT

**page 46**

```
goal (
  if agent-has-passed
  seq ( if door-open, pass-through-door )
  seq ( if door-unlocked, open-door )
  seq ( if has-key, unlock-door )
)
```

**page 48**

```
seq (
  goal (
    if and
      gt battery-level 20%
      not recharging
    recharge-battery
  )
  do-main-task
)
```




```























```








