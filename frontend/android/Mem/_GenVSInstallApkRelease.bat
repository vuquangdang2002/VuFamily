del .\app-release.apks

java -jar C:\Libs\bundletool_all_1_8_0.jar build-apks --connected-device --bundle=.\app-release.aab --output .\app-release.apks --ks=.\vu_family.keystore --ks-pass=pass:dangvq@123 --ks-key-alias=vu_family --key-pass=pass:dangvq@123

java -jar C:\Libs\bundletool_all_1_8_0.jar install-apks --apks=.\app-release.apks

pause