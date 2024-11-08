@echo off
 
:start
echo 1:设置阿里云DNS 2:设置邮件DNS 3:退出
set /p var=请选择
if %var%==1 goto opt1
if %var%==2 goto opt2
if %var%==3 goto opt3
 
:opt1
cls
 
echo 设置主DNS 223.5.5.5  
cmd /c netsh interface ip set dns name="以太网" source=static addr=223.5.5.5
echo 设置副DNS 223.6.6.6
cmd /c netsh interface ip add dns name="以太网" addr=223.6.6.6 index=2
ipconfig /flushdns
 
echo 完成
goto start
 
:opt2
cls
 
echo 设置主DNS 10.0.9.150 
cmd /c netsh interface ip set dns name="以太网" source=static addr=10.0.9.150
echo 设置副DNS 10.0.1.150
cmd /c netsh interface ip add dns name="以太网" addr=10.0.1.150 index=2
ipconfig /flushdns
 
echo 完成
goto start

:opt3
cls
exit