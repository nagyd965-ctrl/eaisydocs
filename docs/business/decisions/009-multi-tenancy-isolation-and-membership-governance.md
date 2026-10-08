# [Közös] B-009: Többcég-kezelés és Tagsági Jogosultsági Szabályok

## Státusz
Elfogadva (Implemented & Verified)

## Dátum
2026-10-08

## Üzleti Szabályok és Alapelvek

### 1. Cég Alapítás és Tulajdonjog
- Bármely hitelesített felhasználó alapíthat új céget.
- Az alapító automatikusan `owner` (tulajdonos) szerepkört kap a céghez tartozóan.
- Az `owner` teljes körű jogosultsággal rendelkezik a cég adatainak, tagjainak és beállításainak kezelésére, valamint jogosult a céget törölni (amennyiben nem áll fenn törvényi megőrzési kötelezettség).

### 2. Cégtagság és Szerepkörök (`company_members`)
- Egy felhasználó több cég tagja lehet egyszerre.
- A szerepkörök vállalatonként függetlenek:
  - `owner`: Cégtulajdonos (kizárólagos jog cégadatok módosítására, tagok megtekintésére, új tagok meghívására és eltávolítására)
  - `admin`: Vállalati adminisztrátor
  - `member`: Rendes munkatárs (a globális profil szerinti `docs_szerepkor` és `hr_szerepkor` szerint tevékenykedik)
- **Tagvédelem és Láthatósági Szabály**: A céghez tartozó tagok listáját kizárólag a cég tulajdonosa tekintheti meg. Sima munkatárs (`member`) sem más munkavállalót, sem saját magát nem törölheti a cégből a felületen.

### 3. Meghívás és Csatlakozás Kód Alapján
- A cég tulajdonosa kérésre egy kriptográfiailag biztonságos, 6 karakteres csatlakozási kódot generálhat (`share_token`).
- A kód érvényességi ideje 10 perc, amely valós időben számlál vissza. Lejárat után a kód érvényét veszti.
- A kóddal rendelkező munkatárs a felületen azonnal csatlakozhat a vállalathoz, amely után automatikus `member` hozzáférést kap.

### 4. Szigorú Adatszeparáció és Jogszabályi Megfelelőség
- **Nem keveredhetnek adatok**: Semmilyen irat, ügyirat, partner vagy dolgozói adatlap nem szivároghat át más vállalkozásokhoz.
- **Számozási rendszerek izolációja**: Az érkeztetőszámok, iktatószámok és ügyszámok cég-specifikusan allokálódnak (`erkeztetoszam_allokacio`, `iktatoszam_allokacio`, `ugyszam_allokacio`), elkerülve az ütközéseket és a számozási hézagokat a cégek között.

