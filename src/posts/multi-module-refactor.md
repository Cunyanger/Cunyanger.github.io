# Yin 鍗曚綋澶氭ā鍧楁敼閫犺褰?
## 鏀归€犵洰鏍?
灏嗗師鏉ョ殑鍗曟ā鍧?Spring Boot 椤圭洰璋冩暣涓哄崟浣撳妯″潡缁撴瀯锛屼繚鎸佷竴涓簲鐢ㄨ繘绋嬪惎鍔紝鍚屾椂鎶婂叕鍏辫兘鍔涖€佺郴缁熶笟鍔°€佸惎鍔?API 灞傚拰浠ｇ爜鐢熸垚鍣ㄦ媶寮€锛岄檷浣庡悗缁笟鍔℃墿灞曟椂鐨勮€﹀悎銆?
## 妯″潡缁撴瀯

```text
yin
鈹溾攢鈹€ pom.xml                  # 鐖跺伐绋嬶紝缁熶竴鐗堟湰鍜屾彃浠剁鐞?鈹溾攢鈹€ yin-common               # 鍏叡鍩虹鑳藉姏
鈹溾攢鈹€ yin-system               # system 涓氬姟妯″潡
鈹溾攢鈹€ yin-admin                # Spring Boot 鍚姩妯″潡鍜?Web/API 灞?鈹斺攢鈹€ yin-generator              # 浠ｇ爜鐢熸垚鍣ㄥ拰妯℃澘
```

妯″潡渚濊禆鏂瑰悜锛?
```text
yin-admin -> yin-system -> yin-common
yin-generator 鐙珛
```

## 杩佺Щ鍐呭

1. 鏍?`pom.xml` 鏀逛负 `packaging=pom`锛屽０鏄?`yin-common`銆乣yin-system`銆乣yin-admin`銆乣yin-generator` 鍥涗釜瀛愭ā鍧楋紝骞堕泦涓鐞?MapStruct銆丮yBatis Plus銆丣WT銆丄pache POI銆丼pringDoc銆乂elocity 绛夌増鏈€?2. `yin-common` 淇濈暀鍏叡鏍戝伐鍏枫€佹椂闂村伐鍏枫€佺粺涓€鍝嶅簲瀵硅薄銆佸熀纭€瀹炰綋鍜屽熀纭€鍒嗛〉/杞崲鍣ㄣ€?3. `yin-system` 鎵胯浇绯荤粺涓氬姟鐨勫疄浣撱€丏TO銆丵uery銆丮apper銆丼ervice銆丮apStruct Converter锛屽苟鎶?MyBatis XML 缁熶竴杩佺Щ鍒?`src/main/resources/mapper/system`銆?4. `yin-admin` 鎵胯浇鍚姩绫汇€丆ontroller銆佸畨鍏ㄨ璇併€佸叏灞€寮傚父/鍝嶅簲澶勭悊銆丮yBatis Plus 閰嶇疆銆丼wagger 閰嶇疆銆丒xcel 甯姪绫汇€佸簲鐢ㄩ厤缃拰娴嬭瘯銆?5. `yin-generator` 鎵胯浇 `CodeGenerator` 鍜?Velocity 妯℃澘锛岄伩鍏嶇敓鎴愬櫒渚濊禆杩涘叆涓诲簲鐢ㄥ惎鍔ㄦā鍧椼€?
## 涓氬姟鍜屼唬鐮佷紭鍖?
1. 鍚姩绫诲垹闄や簡鍥哄畾瀵嗙爜 BCrypt 鐢熸垚鍜?`System.out` 杈撳嚭锛屽彧淇濈暀搴旂敤鍚姩閫昏緫銆?2. `@MapperScan` 浠庢壂鎻忔暣涓?`com.yinyang.yin` 鏀剁獎鍒?`com.yinyang.yin.mapper`銆?3. 鏁版嵁搴撳湴鍧€銆佽处鍙枫€佸瘑鐮佸拰 JWT 閰嶇疆鏀逛负鐜鍙橀噺璇诲彇锛岄粯璁や娇鐢ㄦ湰鍦板紑鍙戦厤缃細
   - `YIN_DATASOURCE_URL`
   - `YIN_DATASOURCE_USERNAME`
   - `YIN_DATASOURCE_PASSWORD`
   - `YIN_JWT_SECRET`
   - `YIN_JWT_EXPIRATION`
4. `mybatis-plus.mapper-locations` 鏄惧紡閰嶇疆涓?`classpath*:mapper/**/*.xml`锛屼繚璇佹ā鍧楀唴 XML Mapper 鑳借鍔犺浇銆?5. `UserService` 鏀逛负娉ㄥ叆 `PasswordEncoder`锛屼慨澶嶅鍏ョ敤鎴锋椂璋冪敤 `encode` 浣嗘湭鍐欏洖鍝堝笇鍊肩殑闂銆?6. 鐢ㄦ埛鏇存柊鏃跺鏋滄湭浼犳柊瀵嗙爜锛屼細淇濈暀鏁版嵁搴撲腑宸叉湁瀵嗙爜鍝堝笇锛岄伩鍏嶇┖瀵嗙爜瑕嗙洊銆?7. 鍏ㄥ眬寮傚父澶勭悊鏀逛负鏃ュ織璁板綍锛屼笉鍐?`printStackTrace`锛屽苟缁熶竴杩斿洖 `Result`銆?8. 鐧诲綍澶辫触涓嶅啀鍚戝墠绔€忓嚭寮傚父缁嗚妭锛岀粺涓€杩斿洖 `Invalid username or password`銆?9. 浠ｇ爜鐢熸垚鍣ㄥ幓鎺夌‖缂栫爜杩滅▼鏁版嵁搴撹繛鎺ュ拰瀵嗙爜锛屾敼鐢ㄧ幆澧冨彉閲忥細
   - `YIN_GENERATOR_DATASOURCE_URL`
   - `YIN_GENERATOR_DATASOURCE_USERNAME`
   - `YIN_GENERATOR_DATASOURCE_PASSWORD`
   - `YIN_GENERATOR_OUTPUT_DIR`
10. 涓氬姟妯″潡涓殑 `io.jsonwebtoken.lang.Assert` 鏀逛负 `org.springframework.util.Assert`锛岄伩鍏嶉潪瀹夊叏涓氬姟浠ｇ爜渚濊禆 JWT 鍖呫€?11. 琛ュ厖 `spring-boot-starter-validation`锛岃 Controller 涓婄殑 `@Validated` 鏈夊疄闄呮牎楠屾彁渚涜€呫€?12. 鐧诲綍璇锋眰琛ュ厖 `username` 鍜?`password` 闈炵┖鏍￠獙锛岀敤鎴蜂笉瀛樺湪鏃朵娇鐢?Spring Security 鐨?`UsernameNotFoundException`銆?
## 鏋勫缓鍜岄獙璇?
宸叉墽琛岋細

```bash
./mvnw.cmd -q test
./mvnw.cmd -q package
```

缁撴灉锛氭祴璇曞拰瀹屾暣鎵撳寘鍧囬€氳繃銆?
## 杩愯鏂瑰紡

涓诲簲鐢ㄥ叆鍙ｅ湪 `yin-admin` 妯″潡锛?
```bash
./mvnw.cmd -pl yin-admin -am spring-boot:run
```

浣跨敤闈炴湰鍦版暟鎹簱鏃讹紝鍏堣缃幆澧冨彉閲忥紝渚嬪锛?
```bash
set YIN_DATASOURCE_URL=jdbc:mysql://host:3306/db?allowPublicKeyRetrieval=true^&useSSL=false^&serverTimezone=Asia/Shanghai^&characterEncoding=utf8
set YIN_DATASOURCE_USERNAME=root
set YIN_DATASOURCE_PASSWORD=your_password
set YIN_JWT_SECRET=replace-with-at-least-32-bytes-secret
```

